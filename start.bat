@echo off
echo === Log Viewer - Banco Hyundai ===

REM Cria pasta de logs se não existir
if not exist logs mkdir logs

REM Cria virtualenv se não existir
if not exist .venv (
    echo Criando ambiente virtual...
    python -m venv .venv
)

REM Ativa e instala dependências
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt

REM Abre o browser automaticamente e inicia o servidor
echo.
echo Iniciando servidor em http://localhost:5000
echo Pressione Ctrl+C para parar.
echo.
start "" http://localhost:5000
python server.py
