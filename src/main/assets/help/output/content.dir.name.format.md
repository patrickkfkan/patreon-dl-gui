## Content directory name format

---

Name format of content directories. A format is a string pattern consisting
of fields enclosed in curly braces.

Content can be a post or product. A directory is created for each piece of
content. Downloaded items for the content are placed under this directory.

##### Required fields

A format must contain at least one of the following unique identifier fields:

| Field          | Description                      |
| -------------- | -------------------------------- |
| `content.id`   | ID of content.                   |
| `content.slug` | Last segment of the content URL. |

##### Optional fields

In addition, a format may contain the following fields:

| Field                 | Description                            |
| --------------------- | -------------------------------------- |
| `content.name`        | Post title or product name.            |
| `content.type`        | Type of content ("product" or "post"). |
| `content.publishDate` | Publish date (ISO UTC format).         |

##### Conditional separators

Characters enclosed in square brackets followed by a question mark denote conditional separators. If the value of a field could not be obtained or is empty, the conditional separator immediately adjacent to it will be omitted from the name.

---

Default: `{content.id}[ - ]?{content.name}`

Fallback: `{content.type}-{content.id}`
