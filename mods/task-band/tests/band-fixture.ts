// Shared fixture for the task band's box counter, Log reader, frontmatter reader and last-touch rule: note texts with the expected result.
//
// SOURCE OF TRUTH: the memoz-skills repository, mods/task-band/tests/band-fixture.ts. The Memoz app keeps a
// BYTE-IDENTICAL copy and runs its own box counter, Log reader, frontmatter reader and last-touch rule over it; the band's tests run over this
// file too. Keeping the two copies equal is by hand: change one, change the other.
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
      "name": "the file time is a UTC day",
      "note": "---\nstatus: doing\n---\n",
      "modifiedAt": "2026-10-09T23:30:00-03:00",
      "today": "2026-10-13",
      "expected": {
        "day": "2026-10-10",
        "source": "edited",
        "ageDays": 3
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
  "fieldCases": [
    {
      "name": "the last row of a duplicated start wins",
      "note": "---\nstatus: doing\nstart: 2026-10-01\nstart: 2026-10-09\n---\n",
      "expected": {
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
        "start": null,
        "stage": null,
        "hasBranch": false,
        "hasMr": false
      }
    }
  ]
}
