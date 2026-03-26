# Script para gerar a versão portátil da aplicação FiosApp para Windows
# Este script deve ser executado numa máquina Windows com Node.js instalado.

$ProjectName = "FiosApp_Portatil"
$OutputDir = Join-Path $PSScriptRoot $ProjectName

Write-Host "Iniciando processo de geração da aplicação portátil..." -ForegroundColor Cyan

# 1. Limpar diretórios anteriores
if (Test-Path $OutputDir) {
    Write-Host "Limpando pasta de saída anterior..."
    Remove-Item -Path $OutputDir -Recurse -Force
}

# 2. Instalar dependências e Build
Write-Host "Instalando dependências e compilando o projeto..." -ForegroundColor Yellow
npm install
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro durante o build. Abortando." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 3. Criar estrutura da pasta portátil
Write-Host "Criando estrutura da pasta portátil..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $OutputDir
New-Item -ItemType Directory -Path (Join-Path $OutputDir "app")
New-Item -ItemType Directory -Path (Join-Path $OutputDir "node_runtime")

# 4. Copiar ficheiros compilados
Write-Host "Copiando ficheiros..." -ForegroundColor Yellow
# Copiamos tudo de 'dist' diretamente para 'app' para facilitar a portabilidade
Copy-Item -Path "dist/*" -Destination (Join-Path $OutputDir "app") -Recurse

# 5. Copiar node_modules necessários para produção (especialmente better-sqlite3 que tem binários)
Write-Host "Preparando dependências de produção..." -ForegroundColor Yellow
# Criamos um package.json mínimo para o runtime
$fullPackageJson = Get-Content package.json | ConvertFrom-Json
$packageJson = @{
    name = "fios-app-runtime"
    version = "1.0.0"
    type = "module"
    dependencies = @{
        "better-sqlite3" = $fullPackageJson.dependencies."better-sqlite3"
        "express" = $fullPackageJson.dependencies."express"
    }
} | ConvertTo-Json
$packageJson | Out-File -FilePath (Join-Path $OutputDir "app/package.json") -Encoding utf8

# Instalar apenas dependências de produção na pasta de destino para garantir que os binários estão lá
Push-Location (Join-Path $OutputDir "app")
npm install --production
Pop-Location

# 6. Copiar o runtime do Node.js (opcional mas recomendado para independência total)
Write-Host "Copiando runtime do Node.js..." -ForegroundColor Yellow
$nodeExePath = (Get-Command node).Source
$nodeDir = Split-Path $nodeExePath
Copy-Item -Path "$nodeDir/node.exe" -Destination (Join-Path $OutputDir "node_runtime")

# 7. Criar script de lançamento (Batch file)
Write-Host "Criando script de lançamento..." -ForegroundColor Yellow
$batchContent = @"
@echo off
set "NODE_ENV=production"
echo Iniciando FiosApp...
cd /d "%~dp0"
".\node_runtime\node.exe" ".\app\server.js"
pause
"@
$batchContent | Out-File -FilePath (Join-Path $OutputDir "Iniciar-FiosApp.bat") -Encoding ascii

# 8. Criar ficheiro de configuração inicial se não existir
$defaultConfig = @{
    sqliteDbPath = ""
} | ConvertTo-Json
$defaultConfig | Out-File -FilePath (Join-Path $OutputDir "app/app-config.json") -Encoding utf8

Write-Host "`nSucesso! A aplicação portátil foi gerada na pasta: $OutputDir" -ForegroundColor Green
Write-Host "Pode copiar esta pasta para qualquer local ou pen USB."
Write-Host "Para iniciar, execute 'Iniciar-FiosApp.bat'."
