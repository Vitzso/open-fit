; Custom steps for the Windows installer (electron-builder includes build/installer.nsh before its own script).
; The installer is one-click (no pages): the app goes in its own folder, and every choice is made on
; the app's setup screen (setup.html) when it opens.

; Uninstall (and the uninstall of the old version that every update runs) removes only the app's
; own files. electron-builder's default moves the whole install folder away and deletes it, which
; once nearly took an OpenFit data folder (database, settings, certificates) with it: the app had
; been installed into that folder. The app now always gets a folder of its own; this stays as a
; safety net.
!macro customRemoveFiles
  SetOutPath $TEMP
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  Delete "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  Delete "$INSTDIR\${UNINSTALL_FILENAME}"
  Delete "$INSTDIR\chrome_100_percent.pak"
  Delete "$INSTDIR\chrome_200_percent.pak"
  Delete "$INSTDIR\resources.pak"
  Delete "$INSTDIR\d3dcompiler_47.dll"
  Delete "$INSTDIR\dxcompiler.dll"
  Delete "$INSTDIR\dxil.dll"
  Delete "$INSTDIR\ffmpeg.dll"
  Delete "$INSTDIR\libEGL.dll"
  Delete "$INSTDIR\libGLESv2.dll"
  Delete "$INSTDIR\vk_swiftshader.dll"
  Delete "$INSTDIR\vk_swiftshader_icd.json"
  Delete "$INSTDIR\vulkan-1.dll"
  Delete "$INSTDIR\icudtl.dat"
  Delete "$INSTDIR\snapshot_blob.bin"
  Delete "$INSTDIR\v8_context_snapshot.bin"
  Delete "$INSTDIR\LICENSE.electron.txt"
  Delete "$INSTDIR\LICENSES.chromium.html"
  ; Only removed if nothing else is left in it.
  RMDir "$INSTDIR"
!macroend
