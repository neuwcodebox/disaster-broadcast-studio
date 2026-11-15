# 출력 자산

| 파일 | 출처·판본 | 이용조건·가공 |
| --- | --- | --- |
| `regions.geojson.gz` | [vuski/admdongkor 2026-07-01 원본](https://github.com/vuski/admdongkor/blob/master/ver20260701/HangJeongDong_ver20260701.geojson), 원자료 통계청 SGIS | SGIS 공공누리 제1유형, 가공 데이터 CC BY 4.0. 행정동을 시군구로 병합하고 원본의 경계 좌표를 유지. `REGION-LICENSE.txt` 참조. |
| `provinces.geojson.gz` | 위 시군구 경계를 시도 코드로 병합 | 동일 이용조건. 지역 사이 공유 경계를 병합하여 시도 외곽선으로 사용. |
| `countries.geojson.gz` | [Natural Earth 5.1.2, 1:10m admin 0](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_10m_admin_0_countries.geojson), 북한은 [WFP·OCHA/geoBoundaries PRK ADM0](https://www.geoboundaries.org/api/current/gbOpen/PRK/ADM0/) 2018판, revision `9469f09` | Natural Earth는 [Public domain](https://www.naturalearthdata.com/about/terms-of-use/), 북한은 [CC BY 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/). 동아시아 7개국의 원본 경계 좌표를 유지하고 설명 열만 정리. `NORTH-KOREA-LICENSE.txt` 참조. |
| IBM Plex Sans KR 400/600 | npm `@fontsource/ibm-plex-sans-kr` 5.3.0 | [SIL OFL 1.1](https://github.com/IBM/plex/blob/master/LICENSE.txt). 한글 본문용. `FONT-LICENSE.txt` 참조. |
| IBM Plex Mono 400 | npm `@fontsource/ibm-plex-mono` 5.3.0 | 동일 OFL. 시각·페이지 수에 고정폭 숫자 사용. `MONO-FONT-LICENSE.txt` 참조. |
| `preview.png` | 엔진의 허구 기술 검증 화면 | 위 지도·글꼴을 사용한 출력 예시. README 미리보기용으로 npm 패키지에 동봉하며 버전을 고정한 공개 CDN 주소로 제공. |

지도 자산은 원본 좌표를 단순화하거나 정밀도를 낮추지 않고 gzip으로 압축한다. `scripts/build-map-assets.mjs`로 재생성하며 렌더 중 다운로드하지 않는다. MapLibre의 GeoJSON 단순화도 비활성화한다. 기본 지도에서 대한민국 육지·해안·시군구 강조는 같은 SGIS 폴리곤을 사용한다. 시도 구분선은 그 폴리곤을 병합한 경계다. 배경의 대한민국 도형은 기본 지도에서 제외하여 서로 다른 해안선을 겹치지 않는다.

```sh
node scripts/build-map-assets.mjs /path/HangJeongDong_ver20260701.geojson /path/ne_10m_admin_0_countries.geojson /path/geoBoundaries-PRK-ADM0.geojson
```

지도·글꼴은 설치된 패키지와 압축 파일에서 로컬로 로드한다. 지도 위에는 출처를 상시 표시하지 않는다. `attribution.json`의 제공자·원자료·라이선스 링크·가공 내용을 출력 옆 `.credits.txt`와 `.json`에 기록한다. 영상 게시 시 `.credits.txt` 내용을 유튜브 설명란 등 시청자가 접근할 수 있는 곳에 함께 제공한다. 원본 자산과 폰트를 재배포할 때는 동봉 라이선스도 유지한다.

공공누리 1유형은 저작자·출처를 요구하지만 영상 내 고정 위치를 지정하지 않는다. [CC BY 4.0 제3조(a)(2)](https://creativecommons.org/licenses/by/4.0/legalcode)는 매체·상황에 합리적인 방식의 표시와 링크를 허용한다. [CC BY 3.0 IGO 제4조(b)](https://creativecommons.org/licenses/by/3.0/igo/legalcode)도 매체에 합리적인 저작자·출처·가공 표시를 요구하며, 공동 기여자 크레딧을 별도로 넣으면 그 안에서 동등한 비중으로 표시해야 한다. 이 배포물의 기본 지도에는 영상 위 고정 워터마크 의무가 확인되지 않아 공개 설명란 크레딧 방식을 사용한다. 기계 메타데이터만 남기고 게시 출처를 생략하지 않는다. Natural Earth는 public domain이며 OFL은 폰트 파일 재배포 조건이다. 사용자 경계 파일은 WGS84 Polygon/MultiPolygon FeatureCollection이며 `map.attribution`에 필요한 출처표시를 지정한다. 지도는 한반도와 주변 동아시아를 대상으로 한다.

상태·방송 안내·등급별 재난문자 기본음과 선택용 뉴스 음원은 직접 합성한 CC0 음원이며 [생성 코드·이용조건](audio/README.md)을 동봉한다. 긴급·위급재난은 EAS풍 경보의 불협화음과 반복 패턴을 사용한다. 작품 고유의 로컬 음원에는 각각 `source`, `license`를 기록한다. 기술 검증 스크립트의 사인파도 직접 생성한 CC0 음원이다.

Remotion은 [사용 주체별 라이선스 조건](https://www.remotion.dev/pricing)이 적용된다. MapLibre GL JS는 BSD-3-Clause, React는 MIT다.

Tone.js 15.1.22는 MIT 라이선스이며 의존성에 해당 라이선스가 포함된다. 창작 스킬의 `examples/receipt.mjs`, `examples/texture.mjs`는 직접 작성한 CC0-1.0 음향 코드다. `dbs audio`는 코드로 만든 소리와 사용자가 제공한 로컬 샘플을 WAV로 출력한다. 샘플 사용권은 작품별 출처에 보존한다.
