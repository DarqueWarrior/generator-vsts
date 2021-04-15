param (
   [string] $BuildConfiguration,
   [string] $StagingDirectory
)
[reflection.assembly]::LoadWithPartialName("System.Net.Http") | Out-Null
[reflection.assembly]::LoadWithPartialName("System.Threading") | Out-Null
[reflection.assembly]::LoadWithPartialName("System.IO.Compression.FileSystem") | Out-Null
$SourcePath = "https://dotnetcli.blob.core.windows.net/dotnet/Sdk/rel-1.0.0/dotnet-dev-win-x64.latest.zip";
$DestinationPath = "C:\dotnet"
$TempPath = [System.IO.Path]::GetTempFileName()
if (($SourcePath -as [System.URI]).AbsoluteURI -ne $null)
{
$handler = New-Object System.Net.Http.HttpClientHandler
$client = New-Object System.Net.Http.HttpClient($handler)
$client.Timeout = New-Object System.TimeSpan(0, 30, 0)
$cancelTokenSource = New-Object System.Threading.CancellationTokenSource
$uri = New-Object -TypeName System.Uri $SourcePath
$responseMsg = $client.GetAsync($uri, $cancelTokenSource.Token)
$responseMsg.Wait()
if (!$responseMsg.IsCanceled)
{
$response = $responseMsg.Result
if ($response.IsSuccessStatusCode)
{
$fileMode = [System.IO.FileMode]::Create
$fileAccess = [System.IO.FileAccess]::Write
$downloadedFileStream = New-Object System.IO.FileStream $TempPath,$fileMode,$fileAccess
$copyStreamOp = $response.Content.CopyToAsync($downloadedFileStream)
$copyStreamOp.Wait()
$downloadedFileStream.Close()
if ($copyStreamOp.Exception -ne $null)
{
throw $copyStreamOp.Exception
}
}
}
}
else
{
throw "Cannot copy from $SourcePath"
}
[System.IO.Compression.ZipFile]::ExtractToDirectory($TempPath, $DestinationPath)
Remove-Item $TempPath
dotnet --version; $path = Get-ChildItem Env:path; Write-Host $path.Value; $pathValue = $path.Value -Replace "C:\\Program Files\\dotnet","C:\dotnet"; Write-Host $pathValue; $env:Path = $pathValue; dotnet --version
Write-Host "dotnet restore"
dotnet restore
Write-Host "dotnet build"
dotnet build
#dotnet publish --configuration $(BuildConfiguration) --output $(Build.StagingDirectory)/pub
Write-Host "dotnet publish to $DestinationPath"
dotnet publish --configuration $BuildConfiguration --output $DestinationPath