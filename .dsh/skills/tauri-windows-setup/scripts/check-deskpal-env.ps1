# DeskPal Windows environment check (read-only: installs nothing, changes nothing)
# Usage:  powershell -ExecutionPolicy Bypass -File .\.dsh\skills\tauri-windows-setup\scripts\check-deskpal-env.ps1
# Exit code: 0 = all required components present; 1 = something is missing
#
# IMPORTANT: keep this file ASCII-only. Windows PowerShell 5.1 decodes a BOM-less .ps1
# as ANSI, so any non-ASCII character here turns into mojibake and breaks parsing.
# Chinese documentation lives in ../SKILL.md instead.

[CmdletBinding()]
param()

$ErrorActionPreference = 'SilentlyContinue'
$script:missing = 0

function New-Row {
    param([string]$Name, [string]$Status, [string]$Detail)
    [pscustomobject]@{ Component = $Name; Status = $Status; Detail = $Detail }
}

function Get-CmdVersion {
    param([string]$Exe, [string]$Arguments = '--version')
    # never name this parameter $Args: it collides with the automatic variable and
    # silently binds to nothing when the script is run with -File
    $cmd = Get-Command $Exe -ErrorAction SilentlyContinue
    if (-not $cmd) { return $null }
    $out = (& $cmd.Source $Arguments 2>&1 | Select-Object -First 1)
    return @{ Source = $cmd.Source; Version = ("$out").Trim() }
}

$rows = New-Object System.Collections.Generic.List[object]

# 1. Node.js >= 18
$node = Get-CmdVersion 'node' '-v'
if ($node) {
    $major = 0
    [void][int]::TryParse((($node.Version -replace '^v', '') -split '\.')[0], [ref]$major)
    if ($major -ge 18) { $rows.Add((New-Row 'Node.js' 'OK' "$($node.Version)  $($node.Source)")) }
    else { $rows.Add((New-Row 'Node.js' 'FAIL' "$($node.Version) requires >= 18")); $script:missing++ }
} else { $rows.Add((New-Row 'Node.js' 'FAIL' 'not installed or not on PATH')); $script:missing++ }

# 2. pnpm >= 10 (.ps1 shim may be blocked by execution policy; prefer .cmd)
$pnpm = $null
foreach ($cand in 'pnpm.cmd', 'pnpm') {
    $c = Get-Command $cand -ErrorAction SilentlyContinue
    if ($c) { $pnpm = $c; break }
}
if ($pnpm) {
    $ver = (& $pnpm.Source -v 2>&1 | Select-Object -First 1).Trim()
    if ($ver -match '^(\d+)') {
        if ([int]$Matches[1] -ge 10) { $rows.Add((New-Row 'pnpm' 'OK' "$ver  $($pnpm.Source)")) }
        else { $rows.Add((New-Row 'pnpm' 'FAIL' "$ver requires >= 10")); $script:missing++ }
    } else {
        $rows.Add((New-Row 'pnpm' 'FAIL' "cannot execute: $ver (usually the execution policy blocking .ps1 shims - see SKILL.md section 5)"))
        $script:missing++
    }
} else { $rows.Add((New-Row 'pnpm' 'FAIL' 'not installed; run: npm install -g pnpm@10')); $script:missing++ }

# 3. Rust: rustc / cargo / rustup default toolchain
$cargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
$env:Path = "$cargoBin;$env:Path"
foreach ($tool in 'rustc', 'cargo') {
    $t = Get-Command $tool -ErrorAction SilentlyContinue
    if ($t) { $rows.Add((New-Row $tool 'OK' ("$(& $t.Source -V 2>&1 | Select-Object -First 1)".Trim()))) }
    else { $rows.Add((New-Row $tool 'FAIL' "not found; check that $cargoBin is on PATH")); $script:missing++ }
}
$rustup = Get-Command rustup -ErrorAction SilentlyContinue
if ($rustup) {
    $tc = (& $rustup.Source show active-toolchain 2>&1 | Select-Object -First 1).Trim()
    if ($tc -match 'no active toolchain|not installed') { $rows.Add((New-Row 'rustup default toolchain' 'FAIL' "$tc (run: rustup default stable)")); $script:missing++ }
    else { $rows.Add((New-Row 'rustup default toolchain' 'OK' $tc)) }
    $comp = @(& $rustup.Source component list --installed 2>&1)
    $rows.Add((New-Row 'Rust components' $(if ($comp.Count -ge 5) { 'OK' } else { 'WARN' }) "$($comp.Count) installed (expect 6; if fewer: rustup toolchain install stable --force)"))
} else { $rows.Add((New-Row 'rustup' 'FAIL' 'not installed - see SKILL.md section 2')); $script:missing++ }

# 4. MSVC build tools (required to compile the Tauri backend on Windows)
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
if (Test-Path $vswhere) {
    $vcPath = (& $vswhere -products * -latest -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>&1 | Select-Object -First 1)
    if ($vcPath) { $rows.Add((New-Row 'MSVC build tools' 'OK' "$vcPath".Trim())) }
    else { $rows.Add((New-Row 'MSVC build tools' 'FAIL' 'Visual Studio found but the VC++ x86/x64 toolset is missing')); $script:missing++ }
} else { $rows.Add((New-Row 'MSVC build tools' 'FAIL' 'not installed - see SKILL.md section 3 (needs UAC elevation)')); $script:missing++ }

# 5. Windows SDK
$sdkLib = 'C:\Program Files (x86)\Windows Kits\10\Lib'
$sdks = @(Get-ChildItem $sdkLib -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)
if ($sdks.Count -gt 0) { $rows.Add((New-Row 'Windows SDK' 'OK' ($sdks -join ', '))) }
else { $rows.Add((New-Row 'Windows SDK' 'FAIL' "not found under $sdkLib")); $script:missing++ }

# 6. WebView2 runtime
$wvKey = 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
$wv = (Get-ItemProperty $wvKey -ErrorAction SilentlyContinue).pv
if (-not $wv) { $wv = (Get-ItemProperty 'HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' -ErrorAction SilentlyContinue).pv }
if ($wv) { $rows.Add((New-Row 'WebView2 runtime' 'OK' $wv)) }
else { $rows.Add((New-Row 'WebView2 runtime' 'WARN' 'not detected; usually preinstalled on Windows 11, otherwise install the Evergreen Runtime')) }

# 7. PowerShell execution policy (affects npm.ps1 / pnpm.ps1 shims)
$policy = Get-ExecutionPolicy -Scope CurrentUser
if ($policy -in 'Restricted', 'AllSigned', 'Undefined') {
    $rows.Add((New-Row 'PowerShell execution policy' 'WARN' "$policy (blocks .ps1 shims; recommended: CurrentUser=RemoteSigned)"))
} else { $rows.Add((New-Row 'PowerShell execution policy' 'OK' "$policy")) }

# 8. cargo registry mirror (the official source is often throttled in CN)
$cargoCfg = Join-Path $env:USERPROFILE '.cargo\config.toml'
if (Test-Path $cargoCfg) {
    $cfg = Get-Content $cargoCfg -Raw
    if ($cfg -match 'replace-with') { $rows.Add((New-Row 'cargo registry' 'OK' "mirror/replacement configured ($cargoCfg)")) }
    else { $rows.Add((New-Row 'cargo registry' 'WARN' 'config.toml exists but has no source replacement')) }
} else { $rows.Add((New-Row 'cargo registry' 'WARN' 'no mirror configured; see SKILL.md section 4 if dependency downloads crawl')) }

# 9. Project state (run this from the repository root)
$repo = (Get-Location).Path
foreach ($p in 'package.json', 'pnpm-lock.yaml', 'src-tauri\Cargo.toml', 'src-tauri\tauri.conf.json') {
    if (Test-Path (Join-Path $repo $p)) { $rows.Add((New-Row "file $p" 'OK' 'present')) }
    else { $rows.Add((New-Row "file $p" 'WARN' 'not in the current directory; run this script from the repository root')) }
}
if (Test-Path (Join-Path $repo 'node_modules')) { $rows.Add((New-Row 'node_modules' 'OK' 'dependencies installed')) }
else { $rows.Add((New-Row 'node_modules' 'WARN' 'missing; run: pnpm install --frozen-lockfile')) }
if (Test-Path (Join-Path $repo 'src-tauri\target')) { $rows.Add((New-Row 'src-tauri/target' 'OK' 'Rust build cache present')) }
else { $rows.Add((New-Row 'src-tauri/target' 'WARN' 'no build cache yet; the first cargo check needs network access')) }

$rows | Format-Table -AutoSize

$fail = @($rows | Where-Object { $_.Status -eq 'FAIL' }).Count
$warn = @($rows | Where-Object { $_.Status -eq 'WARN' }).Count
"RESULT: {0} missing, {1} warning(s). Fix each missing item with the matching section of SKILL.md." -f $fail, $warn

if ($script:missing -gt 0) { exit 1 } else { exit 0 }
