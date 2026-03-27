@echo off
title Gestao de Fios - Servidor Local
color 0B

echo ===================================================
echo    A iniciar o servidor da Gestao de Fios...
echo ===================================================
echo.

:: 1. Encontrar o Node.js portatil e adicionar ao PATH
set "NODE_PATH="
if exist "..\node.exe" (
    set "NODE_PATH=%~dp0.."
    echo [INFO] Node.js portatil encontrado na pasta anterior.
) else if exist ".\node\node.exe" (
    set "NODE_PATH=%~dp0node"
    echo [INFO] Node.js portatil encontrado na pasta 'node'.
) else if exist "C:\nodeportable\node\node.exe" (
    set "NODE_PATH=C:\nodeportable\node"
    echo [INFO] Node.js portatil encontrado em C:\nodeportable\node.
) else (
    echo [AVISO] Node.js portatil nao encontrado. A tentar usar o Node.js do sistema...
)

if defined NODE_PATH (
    set "PATH=%NODE_PATH%;%PATH%"
)

echo.
echo A iniciar a aplicacao...
echo O seu navegador vai abrir automaticamente em alguns segundos.
echo Pressione CTRL+C para encerrar o servidor quando terminar.
echo.

:: 2. Iniciar o servidor em segundo plano (usando start /b) e aguardar um pouco
start /b cmd /c "call .\node_modules\.bin\tsx.cmd server.ts"

:: 3. Aguardar 3 segundos para o servidor arrancar
timeout /t 3 /nobreak > NUL

:: 4. Abrir o navegador automaticamente
start http://localhost:3000

:: 5. Manter a janela aberta para ver os logs do servidor
echo.
echo Servidor a correr em http://localhost:3000
echo Pode minimizar esta janela.
echo.
pause > NUL
