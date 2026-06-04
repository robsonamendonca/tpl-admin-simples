# Spec: Device Onboarding & SMS Ingestion (Android)

Purpose
- Especificar fluxo de registro e ativação de dispositivo Android para permitir leitura e envio de SMS a uma API externa. Suporte SSO Microsoft (Azure AD/MSAL) para autenticação e consentimento. Distribuição: enterprise/internal.

Scope
- App Android (Kotlin) apenas. UI baseada em Fluent Design.
- Fluxos: login SSO, registro do device, ativação/consentimento, permissão SMS runtime, ingest de SMS.
- Mock backend provido para testes; produção deve validar tokens com Azure.

Requirements

1) Autenticação SSO
- The system SHALL allow user login via Azure AD using MSAL Android (Authorization Code + PKCE).
- The app SHALL obtain an access token (id_token) after successful login and store it securely.

2) Registro de dispositivo (device onboarding)
- The app SHALL POST /devices/register (mock: ?action=register_device) com id_token e deviceInfo.
- Backend SHALL respond with deviceId and policy/status (PENDING or ACTIVE).
- The app SHALL save deviceId locally and not enable SMS ingestion until device is ACTIVE.

3) Ativação e consentimento
- The app SHALL present clear consent screen describing which SMS data will be sent and retention.
- The user SHALL explicitly accept before granting runtime SMS permissions.
- Backend SHALL provide an endpoint to activate/revoke device (mock: ?action=activate_device).

4) Permissões e captura SMS
- The app SHALL request runtime permissions RECEIVE_SMS and READ_SMS before registering the BroadcastReceiver.
- The app SHALL register a BroadcastReceiver to capture incoming SMS and enqueue/send to backend /sms/ingest.
- The app SHALL include deviceId and Authorization Bearer (access token) in ingest requests when available.

5) Backend ingestion
- The backend SHALL accept SMS payloads only from ACTIVE devices or valid Bearer tokens mapped to ACTIVE device.
- The backend SHALL persist SMS to a log and provide admin endpoints to list devices and logs (mock endpoints exist).

6) Privacy & Minimization
- The system SHALL minimize PII sent by default: prefer sender and truncated/hashed body unless full-body consented.
- The system SHALL expose retention policy and an endpoint to delete data (TBD for mock).

APIs (mock / mapping)
- POST ?action=register_device
  body: { id_token, deviceInfo, autoActivate? }
  resp: { status, deviceId, deviceStatus }

- POST ?action=activate_device
  body: { deviceId, activate }
  resp: { status, deviceId, newStatus }

- POST ?action=ingest_sms
  headers: Authorization: Bearer <token> (optional)
  body: { deviceId, remetente, mensagem }
  resp: { status }

- GET ?action=ver_logs -> returns sms_log.txt (text)
- GET ?action=list_devices -> returns devices.json
- GET ?action=get_device&deviceId=...

Acceptance Criteria / Scenarios

Scenario: Successful onboarding and SMS ingest
- WHEN user logs in via Microsoft SSO
- AND app posts deviceInfo to /register_device
- AND backend responds deviceStatus ACTIVE
- AND user grants SMS permissions and consents
- THEN app captures incoming SMS and POSTs to /ingest_sms with deviceId and Bearer token
- AND backend returns 200 and SMS is persisted

Scenario: Device pending activation
- WHEN device registration returns PENDING
- THEN app shows status "Aguardando Ativação" and does not send SMS to backend until ACTIVE

Scenario: Unauthorized device ingest
- WHEN a device that is REVOKED or unknown attempts to send SMS ingest
- THEN backend rejects with 403

Security & Operational Notes
- Use TLS everywhere; in production validate id_token with Azure token introspection or JWKS.
- Store tokens using EncryptedSharedPreferences / Android Keystore.
- Use Play Integrity or SafetyNet attestation for stronger device trust (enterprise decision).
- Consider certificate pinning for backend in production.

UI Hints (Fluent)
- Login: prominent "Entrar com Microsoft" button
- Onboarding: show device model, partial device id, checkbox for consent, CTA "Ativar leitura de SMS"
- Permissions flow: step-by-step guidance and reason strings
- Status screen: device status (ACTIVE/PENDING/REVOKED), last sync, last SMS sent

Fluent UI — design notes
- Prefer Jetpack Compose + Fluent tokens (cores, tipografia, espaçamento) onde disponível; caso contrário mapear tokens Fluent para Material tokens.
- Components: Primary CTA (Entrar/Ativar), Secondary (Mais informações), Info Card (device summary), Toggle (Ativar/Desativar envio), List (histórico minimal).
- Animations: micro-interactions ao conceder permissão e ao enviar consentimento.

Screens & ASCII mockups (wireframes)

1) Tela Login (LoginActivity)

┌────────────────────────────────────────┐
│            Logo App (centred)          │
│                                        │
│   Bem-vindo ao SmsMonitor              │
│   Monitore mensagens autorizadas       │
│                                        │
│   [ Entrar com Microsoft ]   (Primary) │
│                                        │
│   Política de Privacidade | Suporte    │
└────────────────────────────────────────┘

Copy notes: botão clareza: "Entrar com Microsoft" + subtexto opcional "Uso restrito a dispositivos autorizados".

2) Tela Onboarding / Consent (OnboardingActivity)

┌────────────────────────────────────────────────┐
│  Ícone Device   Device: Pixel 8                │
│  Modelo: Pixel 8  Android 13 (parcial id: xx...)│
│                                                │
│  Explicação: O app precisa ler SMS para ...     │
│  [ ] Concordo que mensagens selecionadas sejam │
│      enviadas ao sistema para processamento.    │
│                                                │
│  (Primary) [Ativar leitura de SMS]             │
│  (Secondary) [Saiba mais]                      │
└────────────────────────────────────────────────┘

Accessibility: checkbox focusable, explainable to screen readers.

3) Tela Permissões (PermissionsActivity)

┌──────────────────────────────────────────┐
│  Passo 1 de 1 - Permissões Necessárias   │
│                                          │
│  • Precisamos de Acesso a Mensagens SMS  │
│  • Uso somente após seu consentimento    │
│                                          │
│  [Conceder Permissões]  (opens runtime)  │
│  [Cancelar]                              │
└──────────────────────────────────────────┘

Behavior: abrir requestPermissions API; on denial, mostrar fallback explicando impacto.

4) Tela Status (Main/Status)

┌────────────────────────────────────────────────┐
│  Status do Dispositivo: ACTIVE               [● verde]
│  Usuário: user@empresa.com
│  Último envio: 2026-06-04 14:34
│  Total SMS enviados: 12
│                                                │
│  [Desativar monitoramento]  [Ver histórico]    │
└────────────────────────────────────────────────┘

5) Tela Histórico (History)

┌────────────────────────────────────┐
│  Histórico (últimos 50)            │
│  - 2026-06-04 14:34  +5511999  Msg │
│  - 2026-06-04 13:22  +5511888  Msg │
│  ...                                 │
└────────────────────────────────────┘

User flows (passo-a-passo)

Flow A: Primeiro uso (onboarding)
1. User opens app -> sees Login screen -> taps "Entrar com Microsoft"
2. MSAL flow executes (system browser/embedded tab) -> returns id_token + access_token
3. App calls POST ?action=register_device with id_token + deviceInfo + autoActivate=false (default)
4. Backend returns deviceId + status (PENDING or ACTIVE)
5. If PENDING -> show status "Aguardando ativação" and provide admin contact flow; allow user to view deviceId and copy it for support
6. If ACTIVE -> show Onboarding consent screen
7. User checks consent and taps "Ativar leitura de SMS"
8. App requests runtime SMS permissions; if granted, enable BroadcastReceiver and send queued registration confirmation to backend

Flow B: Re-activation / device changed
1. If device revoked, app shows message and disables receiver
2. Provide button to re-register or to contact admin

Security & UX edge cases
- If MSAL login returns but register_device fails (network), app should retry with exponential backoff and show offline mode messaging.
- If runtime permission denied permanently (Don't ask again), show instructions to enable via Settings with direct deep link to app settings.

Copy & Consent template (short)
- Title: "Permitir leitura de SMS"
- Body: "Para que o SmsMonitor funcione neste dispositivo, precisamos ler mensagens SMS recebidas para (ex.: confirmar transações). Somente mensagens necessárias serão enviadas. Você pode revogar a qualquer momento." 
- CTA: "Concordo e Ativar"

Accessibility checklist
- All CTAs reachable via keyboard/DPAD for TV-like devices
- Color contrast meets WCAG AA for text and primary CTA
- Provide contentDescription on icons and live region updates for status changes
- Support TalkBack: read consent text and permit toggles in order

Design acceptance checklist
- [ ] Fluent tokens mapped to theme
- [ ] Primary CTA style consistent across screens
- [ ] Consent copy reviewed by legal/privacy
- [ ] Error states for network and token issues

Change log (UI addition)
- Added detailed Fluent UI mockups and step-by-step flows for onboarding, permissions, status and history screens.

Next steps
- Review UI copy with stakeholders
- Prototype in Jetpack Compose using Fluent tokens or mapped Material tokens

