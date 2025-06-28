## Media filename format

---

Filename format of a downloaded item. A format is a string pattern consisting of fields enclosed in curly braces.

##### Required fields

A format must contain at least one of the following fields:

| Field            | Description                                                                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `media.id`       | ID of the item downloaded (assigned by Patreon).                                                                                                                                                                     |
| `media.filename` | Can be one of the following, in order of availability:<ul><li>original filename included in the item's API data; or</li><li>filename derived from the header of the response to the HTTP download request.</li></ul> |

##### Optional fields

In addition, a format may contain the following fields:

| Field           | Description                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------- |
| `media.type`    | Type of item (e.g. "image" or "video").                                                     |
| `media.variant` | Where applicable, the variant of the item (e.g. "original", "thumbnailSmall"...for images). |

If you enabled "All media variants", `media.variant` will be appended to the filename regardless of whether you have included it in the format.

Sometimes `media.filename` could not be obtained, in which case it will be replaced with `media.id`, unless it is already present in the format.

##### Conditional separators

Characters enclosed in square brackets followed by a question mark denote conditional separators. If the value of a field could not be obtained or is empty, the conditional separator immediately adjacent to it will be omitted from the name.

---

Default: `{media.filename}`

Fallback: `{media.type}-{media.id}`
