param(
    [Parameter(Mandatory=$true)][string]$GameData,
    [Parameter(Mandatory=$true)][string]$Divine,
    [string]$DotNet,
    [string]$Destination = (Join-Path $PSScriptRoot '..\.local-assets\extracted')
)
$ErrorActionPreference = 'Stop'
if (!(Test-Path (Join-Path $GameData 'Game.pak'))) { throw 'GameData must contain Game.pak' }
if (!(Test-Path $Divine)) { throw 'Divine executable or DLL not found' }
New-Item -ItemType Directory -Force $Destination | Out-Null
function Extract-Package([string]$Package, [string]$Expression) {
    $arguments = @('-g','bg3','-a','extract-package','-s',(Join-Path $GameData $Package),'-d',$Destination,'-x',$Expression,'--use-regex')
    if ($DotNet) { & $DotNet $Divine @arguments } else { & $Divine @arguments }
    if ($LASTEXITCODE -ne 0) { throw "Extraction failed: $Package" }
}
Extract-Package 'Game.pak' '^(Mods/MainUI/GUI/Pages/ActiveRoll[.]xaml|Public/Game/GUI/(Assets/(ActiveRoll/.*|DiceSets/Default/.*|AbilityIcons/.*|Fonts/(NotoSerifSC-Regular[.]otf|QuadraatOffcPro/QuadraatOffcPro(-Bold)?[.]ttf))|Library/DiceAnimation[.]xaml|Theme/.*[.]xaml))$'
Extract-Package 'SharedSoundBanks.pak' '^Public/(Shared/Assets/Sound/UI[.]bnk|Game/Assets/Sound/Init[.]bnk)$'
Write-Output "Extracted to $Destination. Game installation was not modified."
