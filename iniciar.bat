@echo off
title Gestao de Fios - Servidor Local
color 0B

echo ===================================================
echo    A iniciar o servidor da Gestao de Fios...
echo ===================================================
echo.

:: 1. Tentar encontrar o Node.js portátil (na pasta 'node' dentro do projeto ou um nível acima)
if exist ".\node\node.exe" (
    set "PATH=%~dp0node;%PATH%"
    echo [INFO] Node.js portatil encontrado na pasta do projeto.
) else if exist "..\node\node.exe" (
    set "PATH=%~dp0..\node;%PATH%"
    echo [INFO] Node.js portatil encontrado na pasta anterior.
) else (
    echo [AVISO] Pasta 'node' portatil nao encontrada. A tentar usar o Node.js do sistema...
)

echo.
echo A iniciar a aplicacao...
echo Pressione CTRL+C para encerrar o servidor quando terminar.
echo.

:: 2. Executar o servidor usando o tsx instalado localmente
call .\node_modules\.bin\tsx.cmd server.ts

:: 3. Se houver erro, manter a janela aberta
if %ERRORLEVEL% NEQ 0 (
    echo.
    color 0C
    echo [ERRO] Ocorreu um problema ao iniciar o servidor.
    echo Verifique se executou a preparacao (npm install) num PC sem restricoes.
    pause
)
