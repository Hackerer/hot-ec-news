export function generateWindowsTaskScript(projectRoot: string, time: string): string {
  return `$taskName = "hot-ec-news"
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c cd /d \\"${projectRoot}\\" && npm run run:daily"
$trigger = New-ScheduledTaskTrigger -Daily -At "${time}"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force
`;
}

export function generateWindowsTaskRemoveScript(): string {
  return `$taskName = "hot-ec-news"
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
`;
}

export function generateWindowsTaskStatusScript(): string {
  return `$taskName = "hot-ec-news"
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($null -eq $task) {
  Write-Output '{"installed":false,"state":"missing"}'
} else {
  $payload = [PSCustomObject]@{
    installed = $true
    state = $task.State.ToString()
    taskName = $task.TaskName
  }
  $payload | ConvertTo-Json -Compress
}
`;
}
