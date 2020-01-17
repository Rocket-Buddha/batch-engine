# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2020-??-??

### Added

- Async batch execution controller for aggregator steps chain core framework:
  - Add client steps aggregators API. 
  - Concurrency control API.
  - Client error handling API.
  - Batch execution status report.
  - Recovery API.
  - Retry API.
  - Batch execution resume.
- Debug Features.
- LevelDb persistance layer for transactional data.
- CI pipeline kickoff.
  - Code static check, style and code smells, with eslint.
  - Unit testing kickoff coverage.