## Log file directory

---

The destination directory of the log file. Can be a fixed path or string pattern.

##### String pattern

A pattern consists of fields enclosed in curly braces. The fields will be replaced with actual values at runtime. Available fields:

| Field                         | Description                                                                                                                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `out.dir`                     | The directory given for "Destination" under "Download".                                                                                                                                                                                      |
| `target.url.path`             | The pathname of the target's URL, sanitized as necessary.                                                                                                                                                                                    |
| `datetime.<date-time format>` | The date-time of logger creation, where `<date-time format>` is the string pattern used to format the date-time value. For pattern rules, refer to [https://github.com/felixge/node-dateformat](https://github.com/felixge/node-dateformat). |

---

Default: `{out.dir}/logs/{target.url.path}`
