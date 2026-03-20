@echo off
echo === Atualizando Log Viewer ===

git pull origin master
if %ERRORLEVEL% neq 0 (
    echo Erro ao atualizar. Verifique sua conexao e tente novamente.
    pause
    exit /b 1
)

echo.
echo Atualizado com sucesso! Reinicie o start.bat para aplicar as mudancas.
pause
