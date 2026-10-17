# H02 entrance build evidence

See [implementation and timing](../../H02-HAMMER-ENTRANCE.md). Both meshes come from the two exact user-provided Hunyuan shares; no primitive character/hammer substitutes are used.

`report.json` records actual render-worker bone/hammer coordinates across twelve entrance phases, texture state, movement/F, quit and offline reload after clearing the GLB IndexedDB cache. `h01-regression.json` records the independent H01 compatibility-renderer entrance/offline regression. All browser checks passed without captured JavaScript/WebGL shader errors.

`build-evidence.json` binds the signed APK to the source fingerprint and hashes of all 17 packaged GLB variants. The APK is 43,878,542 bytes and uses the same debug certificate as its predecessor. Node validation: 128 rules + 215 master + 27 engine/character checks = 370 passed, zero failed. Logs and seven visual-review frames are retained here.

The first head-impact and final cap-stamp anchors are on the actual stage plane (errors below 0.03m); the final hand/shaft IK error is under 0.001m. These numerical checks do not certify artistic quality or simulate cloth. The Free Fire reference image was not present in the message; the flying pose follows the written description. No Android device was connected, so device FPS/RAM/thermals remain unmeasured.
