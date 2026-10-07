$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Project = Split-Path $PSScriptRoot -Parent
Set-Location $Project
try {
    $Node = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($Node) {
        & $Node.Source -e "process.exit(Number(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)"
        if ($LASTEXITCODE -ne 0) { $Node = $null }
    }
    if ($Node) { $Executable = $Node.Source } else {
        $Runtime = Join-Path $Project '.local-runtime'
        $Executable = Join-Path $Runtime 'node\node.exe'
        if (!(Test-Path $Executable)) {
            Write-Host 'Downloading portable Node.js from nodejs.org (first launch only)...'
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            New-Item -ItemType Directory -Force $Runtime | Out-Null
            $Architecture = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64') {'arm64'} else {'x64'}
            $Base = 'https://nodejs.org/dist/latest-v22.x/'
            $Sums = (Invoke-WebRequest ($Base + 'SHASUMS256.txt') -UseBasicParsing -TimeoutSec 120).Content
            $Match = [regex]::Match($Sums, "(?m)^([a-f0-9]{64})\s+(node-v22\.[0-9]+\.[0-9]+-win-$Architecture\.zip)\r?$")
            if (!$Match.Success) { throw 'Official Node.js package not found in checksum list' }
            $Archive = Join-Path $Runtime $Match.Groups[2].Value
            Invoke-WebRequest ($Base + $Match.Groups[2].Value) -OutFile $Archive -UseBasicParsing -TimeoutSec 120
            if ((Get-FileHash $Archive -Algorithm SHA256).Hash.ToLower() -ne $Match.Groups[1].Value) { throw 'Node.js checksum mismatch' }
            $Unpacked = Join-Path $Runtime 'unpacked'
            Expand-Archive $Archive -DestinationPath $Unpacked -Force
            Move-Item (Join-Path $Unpacked ([IO.Path]::GetFileNameWithoutExtension($Archive))) (Join-Path $Runtime 'node')
            Remove-Item $Archive
            Remove-Item $Unpacked -Recurse -Force
        }
    }
    & $Executable (Join-Path $Project 'launch.mjs')
    if ($LASTEXITCODE -ne 0) { throw "Launcher exited with code $LASTEXITCODE" }
} catch {
    Write-Host $_ -ForegroundColor Red
    exit 1
}
