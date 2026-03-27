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
echo Pressione CTRL+C para encerrar o servidor quando terminar.
echo.

:: 2. Executar o servidor
call .\node_modules\.bin\tsx.cmd server.ts

:: 3. Se houver erro, manter a janela aberta
if %ERRORLEVEL% NEQ 0 (
    echo.
    color 0C
    echo [ERRO] Ocorreu um problema ao iniciar o servidor.
    echo Verifique se executou a preparacao (npm install) num PC sem restricoes.
    pause
)
