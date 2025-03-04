## Campaign directory name format

---

Name format of campaign directories. A format is a string pattern consisting of fields enclosed in curly braces.

When you download content, a directory is created for the campaign that hosts the content. Content directories, which stores the downloaded content, are then placed under the campaign directory. If campaign info could not be obtained from content, then content directory will be created directly under `out.dir`.

A format must contain at least one of the following fields:

- `creator.vanity`
- `creator.name`
- `creator.id`
- `campaign.name`
- `campaign.id`

Characters enclosed in square brackets followed by a question mark denote conditional separators. If the value of a field could not be obtained or is empty, the conditional separator immediately adjacent to it will be omitted from the name.

---

Default: `{creator.vanity}[ - ]?{campaign.name}`

Fallback: `campaign-{campaign.id}`
