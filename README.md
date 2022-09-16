# Match Files Changed

This action checks if any files changed in a PR or commit match a specified pico pattern.

A lot of this Action is based of https://github.com/jitterbit/get-changed-files, so kudos to them!

## Inputs

### `pattern`

**Required** The pico pattern to match changed files with, eg `**/(package**.json|yarn.lock)`

## Outputs

### `changed`

Boolean value. True if any of the changed files match the pattern.

## Example usage

```yaml
uses: guardian/actions-match-files-changed@v1
  with:
    pattern: '**/(package**.json|yarn.lock)'
```