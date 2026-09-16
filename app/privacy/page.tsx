import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";
import {
  CONTACT_EMAIL,
  OPERATOR_NAME,
  SITE_URL,
} from "@/lib/site-config";
import {
  ADSENSE_CLIENT_ID,
  ADSENSE_SCRIPT_ENABLED,
} from "@/lib/adsense";

export const metadata: Metadata = {
  title: "개인정보 · 저장 정보 안내",
  description: "딴짓모아가 사용하는 브라우저 저장 정보, 관리자 로그인과 광고 준비 상태를 안내합니다.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Privacy"
      title="개인정보 · 저장 정보 안내"
      lead="현재 GitHub 버전의 딴짓모아가 어떤 정보를 사용하고 어디에 보관하는지 설명합니다."
      updatedAt="2026-09-16"
    >
      <section className="info-section">
        <h2>핵심 안내</h2>
        <ul>
          <li>일반 게임 이용에는 회원가입이나 이름·전화번호 입력이 필요하지 않습니다.</li>
          <li>게임 진행 기록과 소리 설정은 기본적으로 현재 브라우저에 저장됩니다.</li>
          <li>AdSense 사이트 확인용 메타 태그와 ads.txt가 포함되어 있습니다.</li>
          <li>
            {ADSENSE_SCRIPT_ENABLED
              ? "현재 빌드는 Google AdSense 광고 스크립트를 불러오도록 설정되어 있습니다."
              : "현재 기본 설정에서는 Google AdSense 광고 스크립트를 불러오지 않습니다."}
          </li>
          <li>광고 송출 설정을 변경하면 이 안내와 동의 관리 상태를 함께 재검토합니다.</li>
        </ul>
      </section>

      <section className="info-section">
        <h2>브라우저에 저장되는 정보</h2>
        <div className="info-table-wrap">
          <table className="info-table">
            <thead>
              <tr>
                <th>항목</th>
                <th>목적</th>
                <th>보관과 삭제</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>효과음·진동 설정</td>
                <td>다른 게임이나 재접속에서도 사용자가 선택한 설정 유지</td>
                <td>브라우저 사이트 데이터를 지울 때까지 유지</td>
              </tr>
              <tr>
                <td>2048 진행 상태와 최고 기록</td>
                <td>게임판·점수·최근 무르기 상태 복원</td>
                <td>새 게임·게임 종료·기록 삭제 또는 브라우저 데이터 삭제 시 정리</td>
              </tr>
              <tr>
                <td>오목·오셀로 진행 상태</td>
                <td>게임판·차례·대전 모드·최근 무르기 상태 복원</td>
                <td>게임 종료·새 게임·기록 삭제 또는 브라우저 데이터 삭제 시 정리</td>
              </tr>
              <tr>
                <td>최근 이어하기 목록</td>
                <td>홈에서 진행 중인 게임을 다시 찾기</td>
                <td>최대 8개 메타정보를 보관하며 이용자가 개별 삭제 가능</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          이 기록은 다른 기기로 자동 이동하지 않습니다. 비공개 모드, 저장 차단,
          브라우저 데이터 삭제 또는 사이트 주소 변경으로 사라질 수 있으며 운영자가 복원할 수 없습니다.
        </p>
      </section>

      <section className="info-section">
        <h2>Google AdSense 준비와 광고</h2>
        <p>
          사이트 소유권과 광고 판매자 정보를 확인할 수 있도록
          <code> google-adsense-account={ADSENSE_CLIENT_ID}</code> 메타 정보와
          루트 경로의 ads.txt를 제공합니다. 이 두 항목 자체는 게임 이용자의 이름이나
          연락처를 수집하기 위한 기능이 아닙니다.
        </p>
        {ADSENSE_SCRIPT_ENABLED ? (
          <>
            <p>
              현재 빌드에서는 Google AdSense 광고 코드가 실행될 수 있습니다. 광고 제공 과정에서
              Google과 그 파트너가 쿠키, IP 주소, 기기·브라우저 정보, 광고 상호작용 정보를 처리할 수 있습니다.
            </p>
            <p>
              적용 지역에서 필요한 동의 메시지는 Google Privacy &amp; messaging 또는 Google 인증 CMP의
              실제 게시 상태에 따라 제공되어야 합니다.
            </p>
          </>
        ) : (
          <p className="info-callout">
            광고 코드 요청은 사이트 승인, 동의 관리 준비, 운영 활성화의 세 조건을 모두 충족할 때만
            실행되도록 차단되어 있습니다.
          </p>
        )}
      </section>

      <section className="info-section">
        <h2>관리자 로그인</h2>
        <p>
          관리자 화면은 허용된 운영자만 Google 로그인을 사용할 수 있습니다. 로그인 과정에서
          Google 계정 이메일과 계정 식별정보가 권한 확인에 사용되고, 로그인 상태 유지를 위해
          세션 쿠키가 사용될 수 있습니다. 이는 일반 이용자를 위한 회원가입 기능이 아닙니다.
        </p>
      </section>

      <section className="info-section">
        <h2>호스팅·통신 기록과 외부 서비스</h2>
        <p>
          페이지를 요청하면 서비스 제공을 위해 호스팅 사업자와 통신망에 IP 주소,
          사용자 에이전트, 요청 시각 같은 통신 정보가 전달될 수 있습니다. 보안·장애 대응을 위한
          호스팅 로그의 처리 범위와 보관기간은 해당 제공자의 운영 정책이 적용됩니다.
        </p>
        <p>
          선택형 방문 분석이나 다른 광고·외부 서비스를 추가하면 실제 구현과 지역별 요구사항에 맞게
          이 안내를 변경하고 필요한 동의 절차를 적용합니다.
        </p>
      </section>

      <section className="info-section">
        <h2>문의 이메일</h2>
        <p>
          이메일로 문의하면 발신 주소와 이용자가 직접 작성한 내용이 운영자의 메일함에 전달됩니다.
          문의 해결에 필요하지 않은 비밀번호, 신분증, 금융정보 등은 보내지 마세요.
        </p>
        <dl>
          <dt>운영자</dt>
          <dd>{OPERATOR_NAME}</dd>
          <dt>문의</dt>
          <dd><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></dd>
        </dl>
      </section>

      <section className="info-section">
        <h2>기록 삭제와 권리 행사</h2>
        <ol>
          <li>게임 화면 또는 홈의 이어하기 카드에서 해당 기록을 삭제합니다.</li>
          <li>브라우저 설정에서 {SITE_URL}의 쿠키·사이트 데이터를 삭제할 수 있습니다.</li>
          <li>운영자가 보유한 문의 내용이나 관리자 관련 정보에 관한 요청은 이메일로 접수합니다.</li>
        </ol>
        <p className="info-callout">
          이 안내는 현재 GitHub 코드의 실제 동작을 기준으로 작성했습니다. 운영 배포의 기능이나
          외부 서비스 설정이 달라지면 공개 전에 다시 검토해야 합니다.
        </p>
      </section>
    </InfoPage>
  );
}
