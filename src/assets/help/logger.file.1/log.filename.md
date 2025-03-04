## Log filename

---

Filename of the log file. Can be a fixed name or string pattern.

##### String pattern

A pattern consists of fields enclosed in curly braces. The fields will be replaced with actual values at runtime. Available fields:

| Field                         | Description                                                                                                                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `target.url.path`             | The pathname of the target's URL, sanitized as necessary.                                                                                                                                                                                    |
| `datetime.<date-time format>` | The date-time of logger creation, where `<date-time format>` is the string pattern used to format the date-time value. For pattern rules, refer to [https://github.com/felixge/node-dateformat](https://github.com/felixge/node-dateformat). |
| `log.level`                   | The log level specified for the file logger.                                                                                                                                                                                                 |

---

Default: `{datetime.yyyymmdd}-{log.level}.log`
