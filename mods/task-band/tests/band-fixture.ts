// Shared fixture for the task band's box counter, Log reader, frontmatter reader and last-touch rule (with and without the task's change history) and history reader (raw history events: expected touch day and deleted mark per task path): note texts and events with the expected result.
//
// SOURCE OF TRUTH: the memoz-skills repository, mods/task-band/tests/band-fixture.ts. The Memoz app keeps a
// BYTE-IDENTICAL copy and runs its own box counter, Log reader, frontmatter reader and last-touch rule over it; the band's tests run over this
// file too. Keeping the two copies equal is by hand: change one, change the other.
// A case with a `zone` is a case about the device's local day: a runner that can set the time zone sets it for that case; one that cannot runs the case only when the device is in that zone.
// The file is code, not JSON, because a mod test can import only code-named files.

export default {
  "boxCases": [
    {
      "name": "no boxes",
      "note": "---\nstatus: doing\n---\n# Title\nplain text\n",
      "expected": {
        "done": 0,
        "open": 0,
        "waived": 0
      }
    },
    {
      "name": "done, open and waived",
      "note": "---\nstatus: doing\n---\n- [x] a\n- [ ] b\n- [~] c\n",
      "expected": {
        "done": 1,
        "open": 1,
        "waived": 1
      }
    },
    {
      "name": "a waived box is in neither done nor open (a task with two done, one open and three waived)",
      "note": "---\nstatus: doing\n---\n- [x] a\n- [X] b\n- [~] c\n- [ ] d\n- [~] e\n- [~] f\n",
      "expected": {
        "done": 2,
        "open": 1,
        "waived": 3
      }
    },
    {
      "name": "every bullet marker and an uppercase X",
      "note": "---\nstatus: doing\n---\n- [x] a\n* [X] b\n+ [ ] c\n",
      "expected": {
        "done": 2,
        "open": 1,
        "waived": 0
      }
    },
    {
      "name": "numbered items count, with . and )",
      "note": "---\nstatus: doing\n---\n1. [x] a\n2) [ ] b\n10. [~] c\n",
      "expected": {
        "done": 1,
        "open": 1,
        "waived": 1
      }
    },
    {
      "name": "blockquoted boxes count",
      "note": "---\nstatus: doing\n---\n> - [x] a\n> - [ ] b\n> > - [~] c\n",
      "expected": {
        "done": 1,
        "open": 1,
        "waived": 1
      }
    },
    {
      "name": "a nested list counts at every depth",
      "note": "---\nstatus: doing\n---\n- [x] a\n  - [ ] b\n    - [~] c\n- [ ] d\n",
      "expected": {
        "done": 1,
        "open": 2,
        "waived": 1
      }
    },
    {
      "name": "a tab-indented child counts",
      "note": "---\nstatus: doing\n---\n- [x] a\n\t- [ ] b\n",
      "expected": {
        "done": 1,
        "open": 1,
        "waived": 0
      }
    },
    {
      "name": "a backtick fence hides its boxes",
      "note": "---\nstatus: doing\n---\n- [x] a\n```md\n- [ ] example\n- [x] example\n```\n- [ ] b\n",
      "expected": {
        "done": 1,
        "open": 1,
        "waived": 0
      }
    },
    {
      "name": "a tilde fence hides its boxes",
      "note": "---\nstatus: doing\n---\n- [ ] a\n~~~\n- [x] example\n~~~\n",
      "expected": {
        "done": 0,
        "open": 1,
        "waived": 0
      }
    },
    {
      "name": "a box in the frontmatter is not counted",
      "note": "---\nstatus: doing\nnote: |\n  - [ ] not a criterion\n---\n- [x] a\n",
      "expected": {
        "done": 1,
        "open": 0,
        "waived": 0
      }
    },
    {
      "name": "an unclosed frontmatter is no frontmatter: the whole text is the body",
      "note": "---\nstatus: doing\n- [ ] a\n- [x] b\n",
      "expected": {
        "done": 1,
        "open": 1,
        "waived": 0
      }
    },
    {
      "name": "a box needs whitespace after the closing bracket",
      "note": "---\nstatus: doing\n---\n- [ ]x\n- [x]y\n- [ ] ok\n",
      "expected": {
        "done": 0,
        "open": 1,
        "waived": 0
      }
    },
    {
      "name": "a box needs a space after the marker",
      "note": "---\nstatus: doing\n---\n-[ ] a\n- [ ] b\n",
      "expected": {
        "done": 0,
        "open": 1,
        "waived": 0
      }
    },
    {
      "name": "a bracket mid-line is not a box",
      "note": "---\nstatus: doing\n---\ntext [ ] a\n- text [ ] b\n- [ ] c\n",
      "expected": {
        "done": 0,
        "open": 1,
        "waived": 0
      }
    },
    {
      "name": "a heading is not a list item",
      "note": "---\nstatus: doing\n---\n# [ ] a\n## [x] b\n- [ ] c\n",
      "expected": {
        "done": 0,
        "open": 1,
        "waived": 0
      }
    },
    {
      "name": "an indented code block is not a box",
      "note": "---\nstatus: doing\n---\n- [ ] a\n\ntext\n\n    - [ ] code\n- [x] b\n",
      "expected": {
        "done": 1,
        "open": 1,
        "waived": 0
      }
    },
    {
      "name": "a numbered item that does not start at 1 cannot interrupt a paragraph",
      "note": "---\nstatus: doing\n---\nsome prose\n2. [ ] prose\n\n3. [x] list\n- [ ] item\n",
      "expected": {
        "done": 1,
        "open": 1,
        "waived": 0
      }
    },
    {
      "name": "a numbered item that starts at 1 interrupts a paragraph",
      "note": "---\nstatus: doing\n---\nsome prose\n1. [ ] item\n",
      "expected": {
        "done": 0,
        "open": 1,
        "waived": 0
      }
    },
    {
      "name": "a lazy continuation keeps the list going",
      "note": "---\nstatus: doing\n---\n- [ ] a\ncontinued\n- [x] b\n",
      "expected": {
        "done": 1,
        "open": 1,
        "waived": 0
      }
    },
    {
      "name": "CRLF notes count like LF notes",
      "note": "---\r\nstatus: doing\r\n---\r\n- [x] a\r\n- [ ] b\r\n- [~] c\r\n",
      "expected": {
        "done": 1,
        "open": 1,
        "waived": 1
      }
    },
    {
      "name": "boxes before and after other headings all count",
      "note": "---\nstatus: doing\n---\n## Completion criteria\n- [x] a\n## Log\n- [ ] b\n## Not Doing\n- [~] c\n",
      "expected": {
        "done": 1,
        "open": 1,
        "waived": 1
      }
    }
  ],
  "logCases": [
    {
      "name": "the newest date wins, not the last line",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-12 — a\n- 2026-10-14 — b\n- 2026-10-13 — c\n",
      "expected": "2026-10-14"
    },
    {
      "name": "a dated line outside the Log section is not a checkpoint",
      "note": "---\nstatus: doing\n---\n- [ ] 2026-10-20 deploy\n## Log\n- 2026-10-10 — x\n",
      "expected": "2026-10-10"
    },
    {
      "name": "the section ends at the next heading of the same level",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-01 — x\n## Notes\n- 2026-10-09 — y\n",
      "expected": "2026-10-01"
    },
    {
      "name": "a deeper heading stays inside the Log section",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-01 — x\n### Round 2\n- 2026-10-05 — y\n",
      "expected": "2026-10-05"
    },
    {
      "name": "a Log heading of any level and a plural are read",
      "note": "---\nstatus: doing\n---\n### Logs (newest first)\n- 2026-10-03 — x\n",
      "expected": "2026-10-03"
    },
    {
      "name": "a heading that only starts with the letters is no Log section",
      "note": "---\nstatus: doing\n---\n## Logbook\n- 2026-10-03 — x\n",
      "expected": null
    },
    {
      "name": "a line may start with the date, bullet or not",
      "note": "---\nstatus: doing\n---\n## Log\n2026-10-02 plain\n* 2026-10-04 star\n",
      "expected": "2026-10-04"
    },
    {
      "name": "a bold date and a numbered line are not read",
      "note": "---\nstatus: doing\n---\n## Log\n- **2026-10-06** — bold\n1. 2026-10-07 — numbered\n- 2026-10-01 — real\n",
      "expected": "2026-10-01"
    },
    {
      "name": "a date that is not a calendar day is skipped",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-13-45 — nonsense\n- 2026-02-30 — nonsense\n- 2026-10-02 — real\n",
      "expected": "2026-10-02"
    },
    {
      "name": "a fenced block inside the Log section is skipped",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-02 — real\n```\n- 2026-10-30 — sample\n```\n",
      "expected": "2026-10-02"
    },
    {
      "name": "no Log section",
      "note": "---\nstatus: doing\n---\n- 2026-10-02 — not in a log\n",
      "expected": null
    },
    {
      "name": "a Log section without a dated line",
      "note": "---\nstatus: doing\n---\n## Log\n- planned\n",
      "expected": null
    },
    {
      "name": "CRLF notes are read",
      "note": "---\r\nstatus: doing\r\n---\r\n## Log\r\n- 2026-10-02 — a\r\n- 2026-10-08 — b\r\n",
      "expected": "2026-10-08"
    }
  ],
  "touchCases": [
    {
      "name": "a Log line only",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-11 — x\n",
      "modifiedAt": null,
      "today": "2026-10-13",
      "expected": {
        "day": "2026-10-11",
        "source": "log",
        "ageDays": 2
      }
    },
    {
      "name": "a quoted start stamp is read without its quotes",
      "note": "---\nstatus: doing\nstart: \"2026-10-10\"\n---\n",
      "modifiedAt": null,
      "today": "2026-10-13",
      "expected": {
        "day": "2026-10-10",
        "source": "start",
        "ageDays": 3
      }
    },
    {
      "name": "the last row of a duplicated start wins",
      "note": "---\nstatus: doing\nstart: 2026-10-01\nstart: 2026-10-09\n---\n",
      "modifiedAt": null,
      "today": "2026-10-13",
      "expected": {
        "day": "2026-10-09",
        "source": "start",
        "ageDays": 4
      }
    },
    {
      "name": "a nested start is read",
      "note": "---\nstatus: doing\nmeta:\n  start: 2026-10-09\n---\n",
      "modifiedAt": null,
      "today": "2026-10-13",
      "expected": {
        "day": "2026-10-09",
        "source": "start",
        "ageDays": 4
      }
    },
    {
      "name": "an indented top-level start is read",
      "note": "---\nstatus: doing\n  start: 2026-10-09\n---\n",
      "modifiedAt": null,
      "today": "2026-10-13",
      "expected": {
        "day": "2026-10-09",
        "source": "start",
        "ageDays": 4
      }
    },
    {
      "name": "a start stamp only",
      "note": "---\nstatus: doing\nstart: 2026-10-10\n---\n",
      "modifiedAt": null,
      "today": "2026-10-13",
      "expected": {
        "day": "2026-10-10",
        "source": "start",
        "ageDays": 3
      }
    },
    {
      "name": "a Log line newer than start",
      "note": "---\nstatus: doing\nstart: 2026-10-01\n---\n## Log\n- 2026-10-11 — x\n",
      "modifiedAt": null,
      "today": "2026-10-13",
      "expected": {
        "day": "2026-10-11",
        "source": "log",
        "ageDays": 2
      }
    },
    {
      "name": "start newer than the Log line",
      "note": "---\nstatus: doing\nstart: 2026-10-12\n---\n## Log\n- 2026-10-05 — x\n",
      "modifiedAt": null,
      "today": "2026-10-13",
      "expected": {
        "day": "2026-10-12",
        "source": "start",
        "ageDays": 1
      }
    },
    {
      "name": "start and Log on the same day: the Log line wins",
      "note": "---\nstatus: doing\nstart: 2026-10-10\n---\n## Log\n- 2026-10-10 — x\n",
      "modifiedAt": null,
      "today": "2026-10-13",
      "expected": {
        "day": "2026-10-10",
        "source": "log",
        "ageDays": 3
      }
    },
    {
      "name": "neither: the file time is the fallback",
      "note": "---\nstatus: doing\n---\nno log\n",
      "modifiedAt": "2026-10-08T10:00:00.000Z",
      "today": "2026-10-13",
      "expected": {
        "day": "2026-10-08",
        "source": "edited",
        "ageDays": 5
      }
    },
    {
      "name": "a start that is not a calendar day is ignored",
      "note": "---\nstatus: doing\nstart: 2026-02-30\n---\n",
      "modifiedAt": "2026-10-08T10:00:00.000Z",
      "today": "2026-10-13",
      "expected": {
        "day": "2026-10-08",
        "source": "edited",
        "ageDays": 5
      }
    },
    {
      "name": "a file time newer than the Log line does not count",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-05 — x\n",
      "modifiedAt": "2026-10-12T08:00:00Z",
      "today": "2026-10-13",
      "expected": {
        "day": "2026-10-05",
        "source": "log",
        "ageDays": 8
      }
    },
    {
      "name": "a future-dated Log line is negative",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-15 — x\n",
      "modifiedAt": null,
      "today": "2026-10-13",
      "expected": {
        "day": "2026-10-15",
        "source": "log",
        "ageDays": -2
      }
    },
    {
      "name": "a future-dated start is negative",
      "note": "---\nstatus: doing\nstart: 2026-10-14\n---\n",
      "modifiedAt": null,
      "today": "2026-10-13",
      "expected": {
        "day": "2026-10-14",
        "source": "start",
        "ageDays": -1
      }
    },
    {
      "name": "no source at all",
      "note": "---\nstatus: doing\n---\n",
      "modifiedAt": null,
      "today": "2026-10-13",
      "expected": null
    },
    {
      "name": "a file time that is not a time is no source",
      "note": "---\nstatus: doing\n---\n",
      "modifiedAt": "garbage",
      "today": "2026-10-13",
      "expected": null
    }
  ],
  "historyCases": [
    {
      "name": "a status event newer than the Log line is the last touch",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-09 — an old step\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-14T12:00:00.000Z",
            "key": "status",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-14",
        "source": "history",
        "ageDays": 1
      }
    },
    {
      "name": "a stage event counts",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-09 — an old step\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-13T12:00:00.000Z",
            "key": "stage",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-13",
        "source": "history",
        "ageDays": 2
      }
    },
    {
      "name": "a checkbox event counts",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-09 — an old step\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-12T12:00:00.000Z",
            "key": "~checkboxes",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-12",
        "source": "history",
        "ageDays": 3
      }
    },
    {
      "name": "other keys do not count: priority, a move, waived boxes, a title",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-09 — an old step\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-14T12:00:00.000Z",
            "key": "priority",
            "writer": "app"
          },
          {
            "t": "2026-10-14T13:00:00.000Z",
            "key": "path",
            "writer": "app"
          },
          {
            "t": "2026-10-14T14:00:00.000Z",
            "key": "~waived",
            "writer": "app"
          },
          {
            "t": "2026-10-14T15:00:00.000Z",
            "key": "title",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-09",
        "source": "log",
        "ageDays": 6
      }
    },
    {
      "name": "a Log line of the same day wins over a history event",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-09 — an old step\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-09T18:00:00.000Z",
            "key": "status",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-09",
        "source": "log",
        "ageDays": 6
      }
    },
    {
      "name": "a start stamp of the same day wins over a history event",
      "note": "---\nstatus: doing\nstart: 2026-10-10\n---\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-10T18:00:00.000Z",
            "key": "status",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-10",
        "source": "start",
        "ageDays": 5
      }
    },
    {
      "name": "a history event older than the Log line does not lower it",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-09 — an old step\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-05T12:00:00.000Z",
            "key": "status",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-09",
        "source": "log",
        "ageDays": 6
      }
    },
    {
      "name": "a history event older than the start stamp does not lower it",
      "note": "---\nstatus: doing\nstart: 2026-10-10\n---\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-02T12:00:00.000Z",
            "key": "stage",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-10",
        "source": "start",
        "ageDays": 5
      }
    },
    {
      "name": "a deleted task's history counts for nothing",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-09 — an old step\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-14T12:00:00.000Z",
            "key": "status",
            "writer": "app"
          }
        ],
        "deleted": true
      },
      "expected": {
        "day": "2026-10-09",
        "source": "log",
        "ageDays": 6
      }
    },
    {
      "name": "a task that is not deleted is read as a live one",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-09 — an old step\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-14T12:00:00.000Z",
            "key": "status",
            "writer": "app"
          }
        ],
        "deleted": false
      },
      "expected": {
        "day": "2026-10-14",
        "source": "history",
        "ageDays": 1
      }
    },
    {
      "name": "the last counting event decides, not a later event of another key",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-09 — an old step\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-11T12:00:00.000Z",
            "key": "status",
            "writer": "app"
          },
          {
            "t": "2026-10-14T12:00:00.000Z",
            "key": "priority",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-11",
        "source": "history",
        "ageDays": 4
      }
    },
    {
      "name": "with several counting events the last one decides",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-09 — an old step\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-11T12:00:00.000Z",
            "key": "status",
            "writer": "app"
          },
          {
            "t": "2026-10-13T12:00:00.000Z",
            "key": "~checkboxes",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-13",
        "source": "history",
        "ageDays": 2
      }
    },
    {
      "name": "a history event is the only source: the file time is not read",
      "note": "---\nstatus: doing\n---\n",
      "modifiedAt": "2026-10-14T08:00:00Z",
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-06T12:00:00.000Z",
            "key": "status",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-06",
        "source": "history",
        "ageDays": 9
      }
    },
    {
      "name": "a history event rescues a task that has no Log line and no start",
      "note": "---\nstatus: doing\n---\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-14T12:00:00.000Z",
            "key": "stage",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-14",
        "source": "history",
        "ageDays": 1
      }
    },
    {
      "name": "no counting event: the file time stays the fallback",
      "note": "---\nstatus: doing\n---\n",
      "modifiedAt": "2026-10-08T10:00:00Z",
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-14T12:00:00.000Z",
            "key": "priority",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-08",
        "source": "edited",
        "ageDays": 7
      }
    },
    {
      "name": "a deleted task falls back to the file time like a task with no history",
      "note": "---\nstatus: doing\n---\n",
      "modifiedAt": "2026-10-08T10:00:00Z",
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-14T12:00:00.000Z",
            "key": "status",
            "writer": "app"
          }
        ],
        "deleted": true
      },
      "expected": {
        "day": "2026-10-08",
        "source": "edited",
        "ageDays": 7
      }
    },
    {
      "name": "no events at all: as without a history",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-09 — an old step\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": []
      },
      "expected": {
        "day": "2026-10-09",
        "source": "log",
        "ageDays": 6
      }
    },
    {
      "name": "an event at 01:30 on the 13th east of UTC is the 13th (the UTC day is the 12th)",
      "zone": "Europe/Istanbul",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-09 — an old step\n",
      "modifiedAt": null,
      "today": "2026-10-14",
      "history": {
        "events": [
          {
            "t": "2026-10-12T22:30:00.000Z",
            "key": "status",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-13",
        "source": "history",
        "ageDays": 1
      }
    },
    {
      "name": "with no event the file time is a local day: 01:30 on the 13th east of UTC (the UTC day is the 12th)",
      "zone": "Europe/Istanbul",
      "note": "---\nstatus: doing\n---\n",
      "modifiedAt": "2026-10-12T22:30:00.000Z",
      "today": "2026-10-14",
      "history": {
        "events": []
      },
      "expected": {
        "day": "2026-10-13",
        "source": "edited",
        "ageDays": 1
      }
    },
    {
      "name": "with no event the file time is a local day: 21:30 on the 13th west of UTC (the UTC day is the 14th)",
      "zone": "America/New_York",
      "note": "---\nstatus: doing\n---\n",
      "modifiedAt": "2026-10-14T01:30:00.000Z",
      "today": "2026-10-15",
      "history": {
        "events": []
      },
      "expected": {
        "day": "2026-10-13",
        "source": "edited",
        "ageDays": 2
      }
    },
    {
      "name": "an event at 21:30 on the 13th west of UTC is the 13th (the UTC day is the 14th)",
      "zone": "America/New_York",
      "note": "---\nstatus: doing\n---\n## Log\n- 2026-10-09 — an old step\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-14T01:30:00.000Z",
            "key": "status",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-13",
        "source": "history",
        "ageDays": 2
      }
    },
    {
      "name": "a backfill event is a day, not an instant: its own stamp is the day",
      "note": "---\nstatus: doing\n---\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-11T00:00:00.000Z",
            "key": "status",
            "writer": "backfill"
          }
        ]
      },
      "expected": {
        "day": "2026-10-11",
        "source": "history",
        "ageDays": 4
      }
    },
    {
      "name": "an event time that is not a time is no source",
      "note": "---\nstatus: doing\n---\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "garbage",
            "key": "status",
            "writer": "app"
          }
        ]
      },
      "expected": null
    },
    {
      "name": "a start that is not a day does not hide a history event",
      "note": "---\nstatus: doing\nstart: 2026-02-30\n---\n",
      "modifiedAt": null,
      "today": "2026-10-15",
      "history": {
        "events": [
          {
            "t": "2026-10-13T12:00:00.000Z",
            "key": "status",
            "writer": "app"
          }
        ]
      },
      "expected": {
        "day": "2026-10-13",
        "source": "history",
        "ageDays": 2
      }
    }
  ],
  "fieldCases": [
    {
      "name": "a plain status",
      "note": "---\nstatus: doing\n---\n",
      "expected": {
        "status": "doing",
        "start": null,
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "a status is read as written: a double-quoted one keeps its quotes",
      "note": "---\nstatus: \"doing\"\n---\n",
      "expected": {
        "status": "\"doing\"",
        "start": null,
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "a status is read as written: a single-quoted one keeps its quotes",
      "note": "---\nstatus: 'doing'\n---\n",
      "expected": {
        "status": "'doing'",
        "start": null,
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "a status is trimmed and lower-cased",
      "note": "---\nstatus:   Doing  \n---\n",
      "expected": {
        "status": "doing",
        "start": null,
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "a status of ~ or null is the word, not nothing",
      "note": "---\nstatus: ~\n---\n",
      "expected": {
        "status": "~",
        "start": null,
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "an empty status is no status",
      "note": "---\nstatus:\n---\n",
      "expected": {
        "status": null,
        "start": null,
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "a status in a flow list is no status",
      "note": "---\nstatus: [doing]\n---\n",
      "expected": {
        "status": null,
        "start": null,
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "a status in a block list is no status",
      "note": "---\nstatus:\n  - doing\n---\n",
      "expected": {
        "status": null,
        "start": null,
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "the last row of a duplicated status wins",
      "note": "---\nstatus: todo\nstatus: review\n---\n",
      "expected": {
        "status": "review",
        "start": null,
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "a nested status is read as a status of its own",
      "note": "---\nstatus: doing\nmeta:\n  status: review\n---\n",
      "expected": {
        "status": "review",
        "start": null,
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "the last row of a duplicated start wins",
      "note": "---\nstatus: doing\nstart: 2026-10-01\nstart: 2026-10-09\n---\n",
      "expected": {
        "status": "doing",
        "start": "2026-10-09",
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "the last row of a duplicated stage wins",
      "note": "---\nstatus: doing\nstage: implementing\nstage: verified\n---\n",
      "expected": {
        "status": "doing",
        "start": null,
        "stage": "verified",
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "a duplicate with nothing after the colon empties the key",
      "note": "---\nstatus: doing\nstage: verified\nstage:\n---\n",
      "expected": {
        "status": "doing",
        "start": null,
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "a nested start is read as a start of its own",
      "note": "---\nstatus: doing\nmeta:\n  start: 2026-10-09\n---\n",
      "expected": {
        "status": "doing",
        "start": "2026-10-09",
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "an indented top-level key is read",
      "note": "---\nstatus: doing\n  start: 2026-10-09\n  stage: verified\n---\n",
      "expected": {
        "status": "doing",
        "start": "2026-10-09",
        "stage": "verified",
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "a nested key overrides an earlier top-level one",
      "note": "---\nstatus: doing\nstart: 2026-10-01\nmeta:\n  start: 2026-10-09\n---\n",
      "expected": {
        "status": "doing",
        "start": "2026-10-09",
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "one pair of quotes goes",
      "note": "---\nstatus: doing\nstart: \"2026-10-10\"\nstage: 'verified'\n---\n",
      "expected": {
        "status": "doing",
        "start": "2026-10-10",
        "stage": "verified",
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "a quote pair that does not match stays",
      "note": "---\nstatus: doing\nstage: \"verified'\n---\n",
      "expected": {
        "status": "doing",
        "start": null,
        "stage": "\"verified'",
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "empty markers carry nothing",
      "note": "---\nstatus: doing\nstage: ~\nbranch: null\nmr: []\nstart:\n---\n",
      "expected": {
        "status": "doing",
        "start": null,
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    },
    {
      "name": "a block list is its items",
      "note": "---\nstatus: doing\nbranch:\n  - feat/x\nmr:\n  - 7\n---\n",
      "expected": {
        "status": "doing",
        "start": null,
        "stage": null,
        "hasBranch": true,
        "hasMr": true
      }
    },
    {
      "name": "a branch is its first value, an MR any value",
      "note": "---\nstatus: doing\nbranch: [~, feat/x]\nmr: [~, 7]\n---\n",
      "expected": {
        "status": "doing",
        "start": null,
        "stage": null,
        "hasBranch": false,
        "hasMr": true
      }
    },
    {
      "name": "an unindented dash is not a list item",
      "note": "---\nstatus: doing\nbranch:\n- feat/x\n---\n",
      "expected": {
        "status": "doing",
        "start": null,
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    }
  ],
  "timelineCases": [
    {
      "name": "no events: no task has a history",
      "files": [
        []
      ],
      "expected": {}
    },
    {
      "name": "a status event is the touch of its path",
      "files": [
        [
          {
            "id": "e1",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": "2026-10-12",
          "deleted": false
        }
      }
    },
    {
      "name": "the newest counting event decides, in time order across files (not in file order)",
      "files": [
        [
          {
            "id": "e2",
            "t": "2026-10-14T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "stage",
            "old": null,
            "new": "implementing",
            "writer": "app"
          }
        ],
        [
          {
            "id": "e3",
            "t": "2026-10-11T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": "2026-10-14",
          "deleted": false
        }
      }
    },
    {
      "name": "an event that is not work on the task leaves the path with no touch",
      "files": [
        [
          {
            "id": "e4",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "priority",
            "old": "2",
            "new": "1",
            "writer": "app"
          },
          {
            "id": "e5",
            "t": "2026-10-13T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "~waived",
            "old": "0",
            "new": "1",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": null,
          "deleted": false
        }
      }
    },
    {
      "name": "one id in two files: the process that made the change, not the observer",
      "files": [
        [
          {
            "id": "same",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          }
        ],
        [
          {
            "id": "same",
            "t": "2026-10-14T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "external"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": "2026-10-12",
          "deleted": false
        }
      }
    },
    {
      "name": "an observer that repeats a value already reached adds no step",
      "files": [
        [
          {
            "id": "e6",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e7",
            "t": "2026-10-14T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "review",
            "new": "doing",
            "writer": "external"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": "2026-10-12",
          "deleted": false
        }
      }
    },
    {
      "name": "a backfill guess that a real event reached is dropped",
      "files": [
        [
          {
            "id": "e8",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e9",
            "t": "2026-10-14T00:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": null,
            "new": "doing",
            "writer": "backfill"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": "2026-10-12",
          "deleted": false
        }
      }
    },
    {
      "name": "a backfill event is its stamp day, in any zone",
      "files": [
        [
          {
            "id": "e10",
            "t": "2026-10-11T00:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": null,
            "new": "doing",
            "writer": "backfill"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": "2026-10-11",
          "deleted": false
        }
      }
    },
    {
      "name": "an event whose time is not canonical is skipped",
      "files": [
        [
          {
            "id": "e11",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e12",
            "t": "2026-10-14T12:00:00Z",
            "path": "Tasks/a.md",
            "key": "stage",
            "old": null,
            "new": "x",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": "2026-10-12",
          "deleted": false
        }
      }
    },
    {
      "name": "a move carries the task's events to the new path",
      "files": [
        [
          {
            "id": "e13",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e14",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/b.md",
            "key": "path",
            "old": "Tasks/a.md",
            "new": "Tasks/b.md",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/b.md": {
          "touchDay": "2026-10-10",
          "deleted": false
        }
      }
    },
    {
      "name": "a move replaces the group the destination had",
      "files": [
        [
          {
            "id": "e15",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e16",
            "t": "2026-10-11T12:00:00.000Z",
            "path": "Tasks/b.md",
            "key": "status",
            "old": "todo",
            "new": "review",
            "writer": "app"
          },
          {
            "id": "e17",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/b.md",
            "key": "path",
            "old": "Tasks/a.md",
            "new": "Tasks/b.md",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/b.md": {
          "touchDay": "2026-10-10",
          "deleted": false
        }
      }
    },
    {
      "name": "a delete marks the task and its history counts for nothing",
      "files": [
        [
          {
            "id": "e18",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e19",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "path",
            "old": "Tasks/a.md",
            "new": null,
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": null,
          "deleted": true
        }
      }
    },
    {
      "name": "a restore clears the mark and keeps the events",
      "files": [
        [
          {
            "id": "e20",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e21",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "path",
            "old": "Tasks/a.md",
            "new": null,
            "writer": "app"
          },
          {
            "id": "e22",
            "t": "2026-10-13T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "path",
            "old": null,
            "new": "Tasks/a.md",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": "2026-10-10",
          "deleted": false
        }
      }
    },
    {
      "name": "a field event at a deleted path is another task: it starts a fresh group",
      "files": [
        [
          {
            "id": "e23",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e24",
            "t": "2026-10-11T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "path",
            "old": "Tasks/a.md",
            "new": null,
            "writer": "app"
          },
          {
            "id": "e25",
            "t": "2026-10-13T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "stage",
            "old": null,
            "new": "implementing",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": "2026-10-13",
          "deleted": false
        }
      }
    },
    {
      "name": "at an equal time a change comes before a move, so it stays with the moved task",
      "files": [
        [
          {
            "id": "e26",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/z.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e27",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "path",
            "old": "Tasks/z.md",
            "new": "Tasks/a.md",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": "2026-10-12",
          "deleted": false
        }
      }
    },
    {
      "name": "equal-time moves follow their chain (x to y before y to a)",
      "files": [
        [
          {
            "id": "e28",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Tasks/x.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e29",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/y.md",
            "key": "path",
            "old": "Tasks/x.md",
            "new": "Tasks/y.md",
            "writer": "app"
          },
          {
            "id": "e30",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "path",
            "old": "Tasks/y.md",
            "new": "Tasks/a.md",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": "2026-10-10",
          "deleted": false
        }
      }
    },
    {
      "name": "a user's own `path:` field recorded under the key path (a legacy writer) is a field change, not a move or a delete",
      "files": [
        [
          {
            "id": "e31",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e32",
            "t": "2026-10-11T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "path",
            "old": "old/value",
            "new": "new/value",
            "writer": "app"
          },
          {
            "id": "e33",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "path",
            "old": "old/value",
            "new": null,
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": "2026-10-10",
          "deleted": false
        }
      }
    },
    {
      "name": "an escaped user key (~key:path) is a plain field change",
      "files": [
        [
          {
            "id": "e34",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e35",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "~key:path",
            "old": "Tasks/a.md",
            "new": null,
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": "2026-10-10",
          "deleted": false
        }
      }
    },
    {
      "name": "a legacy path-key event at a deleted path is another task: a fresh group, not a restore",
      "files": [
        [
          {
            "id": "e36",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e37",
            "t": "2026-10-11T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "path",
            "old": "Tasks/a.md",
            "new": null,
            "writer": "app"
          },
          {
            "id": "e38",
            "t": "2026-10-13T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "path",
            "old": "old/value",
            "new": "new/value",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": null,
          "deleted": false
        }
      }
    },
    {
      "name": "the secrets folder is left out; a folder with a similar name is not it",
      "files": [
        [
          {
            "id": "e39",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Secrets/s.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e40",
            "t": "2026-10-11T12:00:00.000Z",
            "path": "Secrets/deep/s.md",
            "key": "stage",
            "old": null,
            "new": "x",
            "writer": "app"
          },
          {
            "id": "e41",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Secretsz/s.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e42",
            "t": "2026-10-13T12:00:00.000Z",
            "path": "Tasks/z.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Secretsz/s.md": {
          "touchDay": "2026-10-12",
          "deleted": false
        },
        "Tasks/z.md": {
          "touchDay": "2026-10-13",
          "deleted": false
        }
      }
    },
    {
      "name": "a move into the secrets folder drops the task",
      "files": [
        [
          {
            "id": "e43",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e44",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Secrets/a.md",
            "key": "path",
            "old": "Tasks/a.md",
            "new": "Secrets/a.md",
            "writer": "app"
          }
        ]
      ],
      "expected": {}
    },
    {
      "name": "a move out of the secrets folder shows nothing of its past and drops the group the destination had",
      "files": [
        [
          {
            "id": "e45",
            "t": "2026-10-09T12:00:00.000Z",
            "path": "Tasks/b.md",
            "key": "status",
            "old": "todo",
            "new": "review",
            "writer": "app"
          },
          {
            "id": "e46",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Secrets/b.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e47",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/b.md",
            "key": "path",
            "old": "Secrets/b.md",
            "new": "Tasks/b.md",
            "writer": "app"
          }
        ]
      ],
      "expected": {}
    },
    {
      "name": "after a move out of the secrets folder the task's visible history starts with the next event",
      "files": [
        [
          {
            "id": "e48",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Secrets/b.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e49",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/b.md",
            "key": "path",
            "old": "Secrets/b.md",
            "new": "Tasks/b.md",
            "writer": "app"
          },
          {
            "id": "e50",
            "t": "2026-10-13T12:00:00.000Z",
            "path": "Tasks/b.md",
            "key": "stage",
            "old": null,
            "new": "implementing",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/b.md": {
          "touchDay": "2026-10-13",
          "deleted": false
        }
      }
    },
    {
      "name": "the secrets folder is the one in the settings",
      "secretsFolder": "Private",
      "files": [
        [
          {
            "id": "e51",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Private/p.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e52",
            "t": "2026-10-11T12:00:00.000Z",
            "path": "Secrets/s.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Secrets/s.md": {
          "touchDay": "2026-10-11",
          "deleted": false
        }
      }
    },
    {
      "name": "an empty secrets folder hides nothing",
      "secretsFolder": "",
      "files": [
        [
          {
            "id": "e53",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Secrets/s.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Secrets/s.md": {
          "touchDay": "2026-10-10",
          "deleted": false
        }
      }
    },
    {
      "name": "one task path in two Unicode forms is one task (keys are NFC)",
      "files": [
        [
          {
            "id": "e54",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Tasks/\u00e9.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e55",
            "t": "2026-10-12T12:00:00.000Z",
            "path": "Tasks/e\u0301.md",
            "key": "stage",
            "old": null,
            "new": "implementing",
            "writer": "app"
          },
          {
            "id": "e56",
            "t": "2026-10-14T12:00:00.000Z",
            "path": "Tasks/\u00e9.md",
            "key": "~checkboxes",
            "old": "0/1",
            "new": "1/1",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/\u00e9.md": {
          "touchDay": "2026-10-14",
          "deleted": false
        }
      }
    },
    {
      "name": "a move to another form of the same name keeps the task and later events of either form join it",
      "files": [
        [
          {
            "id": "e57",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e58",
            "t": "2026-10-11T12:00:00.000Z",
            "path": "Tasks/e\u0301.md",
            "key": "path",
            "old": "Tasks/a.md",
            "new": "Tasks/e\u0301.md",
            "writer": "app"
          },
          {
            "id": "e59",
            "t": "2026-10-13T12:00:00.000Z",
            "path": "Tasks/\u00e9.md",
            "key": "stage",
            "old": null,
            "new": "implementing",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/\u00e9.md": {
          "touchDay": "2026-10-13",
          "deleted": false
        }
      }
    },
    {
      "name": "a secrets folder written in another Unicode form still hides its tasks",
      "secretsFolder": "Se\u0301crets",
      "files": [
        [
          {
            "id": "e60",
            "t": "2026-10-10T12:00:00.000Z",
            "path": "S\u00e9crets/s.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          },
          {
            "id": "e61",
            "t": "2026-10-11T12:00:00.000Z",
            "path": "Tasks/z.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/z.md": {
          "touchDay": "2026-10-11",
          "deleted": false
        }
      }
    },
    {
      "name": "an event at 01:30 on the 13th east of UTC is the 13th (the UTC day is the 12th)",
      "zone": "Europe/Istanbul",
      "files": [
        [
          {
            "id": "e62",
            "t": "2026-10-12T22:30:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": "2026-10-13",
          "deleted": false
        }
      }
    },
    {
      "name": "an event at 21:30 on the 13th west of UTC is the 13th (the UTC day is the 14th)",
      "zone": "America/New_York",
      "files": [
        [
          {
            "id": "e63",
            "t": "2026-10-14T01:30:00.000Z",
            "path": "Tasks/a.md",
            "key": "status",
            "old": "todo",
            "new": "doing",
            "writer": "app"
          }
        ]
      ],
      "expected": {
        "Tasks/a.md": {
          "touchDay": "2026-10-13",
          "deleted": false
        }
      }
    }
  ]
}
