# 게임 이미지 에셋

이 폴더의 PNG 파일은 게임이 자동으로 찾아 씁니다. 파일이 없는 자리는 기존 이모지·기호로 표시되므로 **일부만 채워도 됩니다.**
파일 목록은 개발 서버(`npm run dev`)와 빌드 시 자동으로 만들어지고(`/assets/manifest.json`), 탭으로 돌아오면 새로 넣은 파일이 반영됩니다.
설정(⚙) → "에셋 현황"에서 어떤 파일이 있고 없는지 우선순위(P0~P2)별로 볼 수 있습니다.

> 현재 들어 있는 이미지는 콘셉트 시트 조각에서 자동 변환한 **임시 이미지**입니다 (`node scripts/import-split-assets.mjs <폴더>`).
> 같은 파일명으로 투명 배경 PNG를 넣으면 덮어쓰기 됩니다.

## 파일명 규칙 (소문자·언더스코어, 투명 배경 PNG)

| 종류 | 경로 | 상태(`_state`) |
|---|---|---|
| 영웅 | `characters/leon/leon_<state>.png` (전사 계열), `elia`(마법사), `serin`(성직자) | `idle` `attack` `hit` `down` `skill` `portrait` |
| 전직별 외형 | `characters/classes/<jobId>/<jobId>_<state>.png` (예: `blademaster`) | 위와 동일. 없으면 기본 영웅 외형 |
| 일반 몬스터 | `monsters/<id>/<id>_<state>.png` (예: `slime`, `goblin`, `skeleton`, `wolf`, `spider` …) | `idle` `attack` `hit` `down` |
| 보스 | `bosses/<id>/<id>_idle.png` (`bell_keeper`, `forgotten_knight`, `mage_doll`, `time_regent`, `still_lord`) | `idle` `attack` `hit` |
| 전직 시험 보스 | `bosses/trial_sentinel`, `trial_warden`, `trial_judge`, `trial_god` | 위와 동일 |
| 전투 배경 | `backgrounds/<zone>/battle.png` (16:9 권장) — `crypt`, `black_forest`, `belkar`, `morgas`, `arca` | |
| 마을 배경 | `backgrounds/ashbell/town.png` | |
| 명령 아이콘 | `ui/icons/cmd_attack.png` `cmd_skill` `cmd_defend` `cmd_item` | |
| 스킬 아이콘 | `ui/icons/skill_<skillId>.png` (예: `skill_fireball`) | |
| 상태 이상 아이콘 | `ui/icons/status_<type>.png` (`burn` `freeze` `stun` `slow` …) | |
| 아이템 아이콘 | `ui/icons/item_<itemId>.png`, 없으면 `ui/icons/slot_weapon` `slot_armor` `slot_accessory` | |

- **애니메이션**: `slime_idle_01.png`, `slime_idle_02.png` … 처럼 `_01`부터 번호를 붙이면 프레임 애니메이션으로 재생됩니다.
- **상태 대체**: `attack`/`hit`/`down` 파일이 없으면 `idle`을 대신 보여줍니다.
- **권장 크기**: 영웅·몬스터 64~96px, 보스 128~192px, 초상화 256px, 아이콘 16~32px. 도트 그림은 확대 시 선명하게 보이도록 처리됩니다.
- **발 위치**: 모든 프레임은 같은 캔버스 크기에서 발이 아래쪽 가운데에 오도록 만들어 주세요(애니메이션이 흔들리지 않습니다).
- 지원 확장자: `png` `webp` `gif`

전체 규격은 `TURNBOUND_게임용_이미지_에셋_가이드.docx`의 5~6장을 따릅니다.
