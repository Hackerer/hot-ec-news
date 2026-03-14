export function generateLaunchdPlist(projectRoot: string, time: string): string {
  const [hour, minute] = time.split(":").map((value) => Number(value));
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.hackerer.hot-ec-news</string>
    <key>ProgramArguments</key>
    <array>
      <string>/bin/zsh</string>
      <string>-lc</string>
      <string>cd '${projectRoot}' && npm run run:daily</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
      <key>Hour</key>
      <integer>${hour}</integer>
      <key>Minute</key>
      <integer>${minute}</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>${projectRoot}/data/schedules/launchd.stdout.log</string>
    <key>StandardErrorPath</key>
    <string>${projectRoot}/data/schedules/launchd.stderr.log</string>
    <key>RunAtLoad</key>
    <false/>
  </dict>
</plist>
`;
}
