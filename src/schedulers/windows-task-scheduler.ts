export function generateWindowsTaskScript(projectRoot: string, time: string): string {
  return `$taskName = "hot-ec-news"
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c cd /d \\"${projectRoot}\\" && npm run run:daily"
$trigger = New-ScheduledTaskTrigger -Daily -At "${time}"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force
`;
}
