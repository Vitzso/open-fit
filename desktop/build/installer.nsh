; Custom steps for the Windows installer (electron-builder includes build/installer.nsh before its own script).

!ifndef BUILD_UNINSTALLER
  ; Folder page: the app goes in a folder of its own. It finds your OpenFit folder by itself.
  !define MUI_DIRECTORYPAGE_TEXT_TOP "Choose where to install the OpenFit app. If it's already installed, keep the folder shown to update it. Don't choose your OpenFit folder (the one with Setup.cmd and your data): the app finds that by itself."

  ; Keeps Next disabled while the folder is an OpenFit data folder. The installer adds "\OpenFit" to a
  ; folder whose name doesn't contain it, so E:\Projects would become E:\Projects\OpenFit, which on
  ; Windows is the same folder as E:\Projects\openfit: both are checked.
  !macro rejectOpenFitDataFolder DIR
    IfFileExists "${DIR}\Setup.cmd" 0 +2
      Abort
    IfFileExists "${DIR}\prisma\schema.prisma" 0 +2
      Abort
    IfFileExists "${DIR}\server.mjs" 0 +2
      Abort
  !macroend

  Function .onVerifyInstDir
    !insertmacro rejectOpenFitDataFolder "$INSTDIR"
    !insertmacro rejectOpenFitDataFolder "$INSTDIR\${APP_FILENAME}"
  FunctionEnd
!endif

; Uninstall (and the uninstall of the old version that every update runs) removes only the app's
; own files. electron-builder's default moves the whole install folder away and deletes it, which
; once nearly took an OpenFit data folder (database, settings, certificates) with it: the app had
; been installed into that folder.
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
