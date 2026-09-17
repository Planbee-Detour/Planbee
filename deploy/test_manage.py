"""배포 실패 경로 및 실제 Compose의 환경 파일 없는 검증을 확인한다. 컨테이너는 실행하지 않는다."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


class DeploymentTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        shutil.copy(Path(__file__).with_name('manage.sh'), self.root)
        shutil.copy(Path(__file__).with_name('remote-deploy.sh'), self.root)
        (self.root / '.env.example').write_text('DB_URL=\n')
        docker = self.root / 'docker'
        docker.write_text('''#!/bin/bash
printf '%s\\n' "$*" >> "$CALLS"
case " $* " in
  *" pull api "*) exit "${PULL_EXIT:-0}" ;;
  *" up "*) exit "${UP_EXIT:-0}" ;;
esac
exit 0
''')
        docker.chmod(0o700)
        self.env = {
            **os.environ,
            'DEPLOY_DIR': str(self.root),
            'IMAGE_REPOSITORY': 'ghcr.io/planbee-detour/planbee-api',
            'IMAGE_TAG': 'test-release',
            'CALLS': str(self.root / 'calls'),
            'PATH': str(self.root) + os.pathsep + os.environ['PATH'],
        }

    def run_action(self, action, **env):
        return subprocess.run(['bash', str(self.root / 'manage.sh'), action],
                              env={**self.env, **env}, capture_output=True, text=True)

    def calls(self):
        path = self.root / 'calls'
        return path.read_text() if path.exists() else ''

    def test_env_is_private_and_preserved(self):
        self.assertEqual(self.run_action('env').returncode, 0)
        path = self.root / '.env'
        self.assertEqual(path.stat().st_mode & 0o777, 0o600)
        path.write_text('existing-placeholder\n')
        self.assertEqual(self.run_action('env').returncode, 0)
        self.assertEqual(path.read_text(), 'existing-placeholder\n')

    def test_invalid_tags_never_call_docker(self):
        for tag in ['', 'latest', 'bad;tag']:
            self.assertNotEqual(self.run_action('deploy', IMAGE_TAG=tag).returncode, 0)
        self.assertEqual(self.calls(), '')

    def test_missing_env_never_calls_docker(self):
        self.assertNotEqual(self.run_action('deploy').returncode, 0)
        self.assertEqual(self.calls(), '')

    def test_failed_pull_keeps_running_container(self):
        self.run_action('env')
        self.assertNotEqual(self.run_action('deploy', PULL_EXIT='1').returncode, 0)
        self.assertIn('pull api', self.calls())
        self.assertNotIn(' up ', self.calls())

    def test_failed_healthcheck_does_not_report_success(self):
        self.run_action('env')
        result = self.run_action('deploy', UP_EXIT='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('배포 완료', result.stdout)

    def test_deploy_pulls_then_waits_without_build(self):
        self.run_action('env')
        result = self.run_action('deploy')
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = self.calls()
        self.assertLess(calls.index('pull api'), calls.index(' up '))
        self.assertIn('--no-build --pull never --wait --wait-timeout 300', calls)
        self.assertIn('--env-file /dev/null -p planbee-production', calls)

    def test_check_never_loads_runtime_env(self):
        self.assertEqual(self.run_action('check').returncode, 0)
        self.assertIn('config --quiet', self.calls())

    def test_real_compose_check_without_env_file(self):
        shutil.copy(Path(__file__).with_name('compose.yml'), self.root)
        result = self.run_action('check', PATH=os.environ['PATH'])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.root / '.env').exists())

    def test_real_compose_check_ignores_runtime_env_path(self):
        shutil.copy(Path(__file__).with_name('compose.yml'), self.root)
        # 실제 운영 시크릿 대신 읽을 수 없는 디렉터리를 둔다. 검증은 이를 열면 안 된다.
        (self.root / '.env').mkdir()
        result = self.run_action('check', PATH=os.environ['PATH'])
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_publish_does_not_require_env(self):
        self.assertEqual(self.run_action('image-push').returncode, 0)
        self.assertIn('push ghcr.io/planbee-detour/planbee-api:test-release', self.calls())
        self.assertFalse((self.root / '.env').exists())

    def run_remote(self, **env):
        gcloud = self.root / 'gcloud'
        gcloud.write_text('''#!/bin/bash
printf '%s\\n' "$*" >> "$CALLS"
case " $* " in
  *" compute scp "*) exit "${SCP_EXIT:-0}" ;;
  *"--command=set -eu"*) exit "${PREFLIGHT_EXIT:-0}" ;;
esac
exit 0
''')
        gcloud.chmod(0o700)
        return subprocess.run(['bash', str(self.root / 'remote-deploy.sh')],
                              env={**self.env, 'GCP_PROJECT_ID': 'example-project',
                                   'GCP_INSTANCE': 'example-vm', 'GCP_ZONE': 'us-central1-a',
                                   'IMAGE_TAG': 'a' * 40, **env}, capture_output=True, text=True)

    def test_remote_rejects_shell_input(self):
        self.assertNotEqual(self.run_remote(IMAGE_TAG='abc;exit 0').returncode, 0)
        self.assertEqual(self.calls(), '')

    def test_remote_preflight_failure_stops_transfer(self):
        self.assertNotEqual(self.run_remote(PREFLIGHT_EXIT='1').returncode, 0)
        self.assertNotIn('compute scp', self.calls())

    def test_remote_transfer_failure_stops_deployment(self):
        self.assertNotEqual(self.run_remote(SCP_EXIT='1').returncode, 0)
        self.assertNotIn('make deploy', self.calls())

    def test_remote_uses_iap_and_preserves_secrets(self):
        self.assertEqual(self.run_remote().returncode, 0)
        calls = self.calls().split('compute ')[1:]
        self.assertEqual(len(calls), 3)
        self.assertTrue(all('--tunnel-through-iap' in line for line in calls))
        files = calls[1].split()
        self.assertIn('.env.example', files)
        self.assertNotIn('.env', files)
        self.assertNotIn('certs/supabase.crt', files)
        self.assertIn('make deploy IMAGE_TAG=' + 'a' * 40, calls[2])


if __name__ == '__main__':
    unittest.main()
