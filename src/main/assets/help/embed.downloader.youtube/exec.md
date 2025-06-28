## YouTube download command

---

The command to download embedded YouTube videos.

Fields enclosed in curly braces will be replaced with actual values at runtime. Available fields:

| Field                | Description                                                     |
| -------------------- | --------------------------------------------------------------- |
| `post.id`            | ID of the post containing the embedded video.                   |
| `embed.provider`     | Name of the provider, i.e. "YouTube".                           |
| `embed.provider.url` | Link to the provider's site.                                    |
| `embed.url`          | Link to the video page supplied by the provider.                |
| `embed.subject`      | Subject of the video.                                           |
| `embed.html`         | The HTML code that embeds the video player on the Patreon page. |
| `dest.dir`           | The directory where the video should be saved.                  |

For example, if you intend to use [yt-dlp](https://github.com/yt-dlp) for YouTube downloads, you may specify the following command:

```
yt-dlp -o "{dest.dir}/%(title)s.%(ext)s" "{embed.url}"
```

This will cause `yt-dlp` to download the video at `embed.url` and save it in `dest.dir`. The filename will be determined by the format `%(title)s.%(ext)s`.

(See: https://github.com/yt-dlp/yt-dlp?tab=readme-ov-fileoutput-template).

##### Note about external downloaders

External downloaders are not subject to "Max retries" (under Other -> Network requests tab) and "File exists action" (under Output tab) settings. This is because `patreon-dl` has no control over the downloading process nor knowledge about the outcome of it (including where and under what name the file was saved).

Also note that external downloaders are not executed when "Dry run" is enabled. This is because `patreon-dl` does not create directories in dry-run and external downloaders might throw an error as they try to write in non-existent directories.

Although care is taken to ensure command arguments are properly escaped, you should be aware of the risks involved in running external programs with arguments having arbitrary values (as you will see, certain embed properties can be passed as arguments). You should always quote strings.
