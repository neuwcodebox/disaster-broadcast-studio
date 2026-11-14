# 출력 자산

| 파일 | 출처·판본 | 이용조건·가공 |
| --- | --- | --- |
| `regions.geojson` | [disaster-feed-web SIG-20260701.json](https://github.com/neuwcodebox/disaster-feed-web/blob/main/public/regions/SIG-20260701.json), [vuski/admdongkor 2026-07-01](https://github.com/vuski/admdongkor/tree/master/ver20260701), 원자료 통계청 SGIS | SGIS 공공누리 제1유형, 가공 데이터 CC BY 4.0. 기존 서비스에서 시군구 단위로 병합·단순화한 파일을 그대로 사용. `REGION-LICENSE.txt` 참조. |
| `countries.geojson` | [Natural Earth 1:110m admin 0](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson) | [Public domain](https://www.naturalearthdata.com/about/terms-of-use/). 세계 국가 경계. |
| Noto Sans KR 400/700 | npm `@fontsource/noto-sans-kr`, package-lock 고정 | SIL OFL 1.1. `FONT-LICENSE.txt` 참조. 렌더 준비 시 설치된 패키지에서 필요한 CSS와 로컬 폰트 파일을 복사. |

기본 지도에는 SGIS·vuski/admdongkor·가공 출처를 표시한다. 사용자 경계 파일은 WGS84 Polygon/MultiPolygon FeatureCollection이며 `map.attribution`에 필요한 출처표시를 지정한다. 지도 경계는 제작 자산이며 실시간 서비스나 원격 타일은 사용하지 않는다.

음원은 기본 제공하지 않는다. 작품의 로컬 음원마다 `source`, `license`를 기록한다. 기술 검증 스크립트의 사인파는 직접 생성한 CC0 음원이다. 실제 기관의 경보음을 자동 삽입하지 않는다.

Remotion은 별도 라이선스가 적용되며 [가격·라이선스 조건](https://www.remotion.dev/pricing)을 사용 주체에 맞춰 확인한다. MapLibre GL JS는 BSD-3-Clause, React는 MIT다.
