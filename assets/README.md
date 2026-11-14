# 출력 자산

| 파일 | 출처·판본 | 이용조건·가공 |
| --- | --- | --- |
| `regions.geojson.gz` | [vuski/admdongkor 2026-07-01 원본](https://github.com/vuski/admdongkor/blob/master/ver20260701/HangJeongDong_ver20260701.geojson), 원자료 통계청 SGIS | SGIS 공공누리 제1유형, 가공 데이터 CC BY 4.0. 행정동을 시군구로 병합하고 원본의 경계 좌표를 유지. `REGION-LICENSE.txt` 참조. |
| `provinces.geojson.gz` | 위 시군구 경계를 시도 코드로 병합 | 동일 이용조건. 지역 사이 공유 경계를 병합하여 시도 외곽선으로 사용. |
| `countries.geojson.gz` | [Natural Earth 5.1.2, 1:10m admin 0](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_10m_admin_0_countries.geojson), 북한은 [WFP·OCHA/geoBoundaries PRK ADM0](https://www.geoboundaries.org/api/current/gbOpen/PRK/ADM0/) 2018판, revision `9469f09` | Natural Earth는 [Public domain](https://www.naturalearthdata.com/about/terms-of-use/), 북한은 [CC BY 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/). 동아시아 7개국의 원본 경계 좌표를 유지하고 설명 열만 정리. `NORTH-KOREA-LICENSE.txt` 참조. |
| IBM Plex Sans KR 400/600 | npm `@fontsource/ibm-plex-sans-kr` 5.3.0 | [SIL OFL 1.1](https://github.com/IBM/plex/blob/master/LICENSE.txt). 한글 본문·지명용. `FONT-LICENSE.txt` 참조. |
| IBM Plex Mono 400 | npm `@fontsource/ibm-plex-mono` 5.3.0 | 동일 OFL. 시각·문자 수·페이지 수에 고정폭 숫자 사용. `MONO-FONT-LICENSE.txt` 참조. |

지도 자산은 원본 좌표를 단순화하거나 정밀도를 낮추지 않고 gzip으로 압축한다. `scripts/build-map-assets.mjs`로 재생성하며 렌더 중 다운로드하지 않는다. MapLibre의 GeoJSON 단순화도 비활성화한다. 기본 지도에서 대한민국 육지·해안·시군구 강조는 같은 SGIS 폴리곤을 사용한다. 시도 구분선은 그 폴리곤을 병합한 경계다. 배경의 대한민국 도형은 기본 지도에서 제외하여 서로 다른 해안선을 겹치지 않는다.

```sh
node scripts/build-map-assets.mjs /path/HangJeongDong_ver20260701.geojson /path/ne_10m_admin_0_countries.geojson /path/geoBoundaries-PRK-ADM0.geojson
```

지도·글꼴은 설치된 패키지와 압축 파일에서 로컬로 로드한다. 기본 화면에는 SGIS·vuski/admdongkor·WFP/OCHA·Natural Earth를 표시한다. 사용자 경계 파일은 WGS84 Polygon/MultiPolygon FeatureCollection이며 `map.attribution`에 필요한 출처표시를 지정한다. 지도는 한반도와 주변 동아시아를 대상으로 한다.

음원은 기본 제공하지 않는다. 작품의 로컬 음원마다 `source`, `license`를 기록한다. 기술 검증 스크립트의 사인파는 직접 생성한 CC0 음원이다. 실제 기관의 경보음을 자동 삽입하지 않는다.

Remotion은 [사용 주체별 라이선스 조건](https://www.remotion.dev/pricing)이 적용된다. MapLibre GL JS는 BSD-3-Clause, React는 MIT다.
