## Embedded Streamable downloader

---

Choose the method to download embedded Streamable videos:

##### Use helper script

`patreon-dl` provides a helper script to download embedded Streamable content. If you choose this option, you must also install [yt-dlp](https://github.com/yt-dlp/yt-dlp). The helper script processes the embed HTML content in the Patreon post and instructs `yt-dlp` to do the actual downloading (using information obtained from the embed HTML).

##### Run external command

Provide the full command to download embedded Streamable content. Set placeholders in the command for `patreon-dl` to inject runtime values (see help details for the "External command" field).
