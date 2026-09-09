package com.planbee.api.admin;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 처리 기록 저장. 지금은 쓰기만 하고 읽는 화면이 없다 (AC-13 — 노출하지 않기로 확정).
 * 조회가 단순하므로 Spring Data 메서드로 충분하다 (S-23).
 */
public interface AdminActionLogRepository extends JpaRepository<AdminActionLog, Long> {
}
