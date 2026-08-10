!macro customInstall
  DetailPrint "Checking Visual C++ Redistributable 2015-2022 (x64)..."
  ClearErrors

  ; Check 64-bit Registry Key for Visual C++ 2015-2022 Redistributable
  ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  StrCmp $0 "1" VcRedistInstalled 0

  ; Check WOW6432Node Registry Key as Fallback
  ReadRegDWORD $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  StrCmp $0 "1" VcRedistInstalled 0

  DetailPrint "Visual C++ Redistributable (x64) is not installed or check bypassed. Running installer silently..."
  SetOutPath "$TEMP"
  File "${BUILD_RESOURCES_DIR}\vc_redist.x64.exe"
  ClearErrors
  ExecWait '"$TEMP\vc_redist.x64.exe" /install /quiet /norestart' $0
  DetailPrint "Visual C++ Redistributable installer finished with exit code: $0 (continuing installation regardless)"
  ClearErrors
  Delete "$TEMP\vc_redist.x64.exe"
  ClearErrors
  Goto DoneVcRedist

  VcRedistInstalled:
  DetailPrint "Visual C++ Redistributable (x64) is already installed."

  DoneVcRedist:
  ClearErrors
!macroend

