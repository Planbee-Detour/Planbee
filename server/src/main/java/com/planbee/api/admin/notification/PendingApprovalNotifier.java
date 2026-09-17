package com.planbee.api.admin.notification;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.planbee.api.auth.PendingApprovalCounter;
import com.planbee.api.auth.SignupCompletedEvent;

/**
 * 가입 신청이 접수되면 관리자 채널에 <b>검토 대기 건수만</b> 알린다. (US-5 / AC-26 ~ AC-32)
 *
 * <p><b>커밋 이후({@link TransactionPhase#AFTER_COMMIT})에 비동기로</b> 처리한다.
 * <ul>
 *   <li>커밋 이후라서 가입이 롤백되면 발송되지 않는다 (AC-30).</li>
 *   <li>비동기라서 Discord 가 느리거나 죽어 있어도 가입 응답(201)이 그만큼 늦어지지 않고,
 *       발송 실패가 가입 결과를 바꾸지 않는다 (AC-27 · AC-28).</li>
 * </ul>
 *
 * <p><b>건수는 {@link PendingApprovalCounter} 로 센다.</b> 알림이 자기 쿼리를 따로 가지면
 * "알림의 숫자와 화면의 숫자가 같다"(AC-32)가 코드로 보장되지 않는다.
 *
 * <p><b>페이로드에 개인정보가 없다.</b> 누가 신청했는지는 이 문장으로 알 수 없고, 관리자는
 * 앱의 관리자 화면에서 확인한다 (AC-1 → AC-5). 대가를 알고 택한 설계다 (AC-31).
 */
@Component
public class PendingApprovalNotifier {

	/**
	 * 알림 문구. 건수 외에는 어떤 값도 끼워 넣지 않는다.
	 * 관리자 화면으로 가는 경로를 문장에 담아 알림만 보고도 다음 행동을 알 수 있게 한다.
	 */
	private static final String MESSAGE_FORMAT = """
			새 가입 신청이 접수됐어요. 현재 검토 대기 %d건입니다.
			앱에서 설정 > 관리자 > 가입 신청 관리를 확인해 주세요.""";

	private final PendingApprovalCounter pendingApprovalCounter;
	private final DiscordWebhookClient discordWebhookClient;

	public PendingApprovalNotifier(
			PendingApprovalCounter pendingApprovalCounter,
			DiscordWebhookClient discordWebhookClient) {
		this.pendingApprovalCounter = pendingApprovalCounter;
		this.discordWebhookClient = discordWebhookClient;
	}

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onSignupCompleted(SignupCompletedEvent event) {
		discordWebhookClient.send(MESSAGE_FORMAT.formatted(pendingApprovalCounter.countPending()));
	}
}
