# Redirect checker tool

## Description

A lightweight Node.js utility to validate HTTP redirects during a website migration (e.g. Squarespace → Shopify).

The script reads CSV files containing migration domains and old/new URL paths.
It requests each old path on the Shopify `new_domain`, then checks that:

- The old URL returns an HTTP **301** redirect.
- The `Location` header matches the expected destination.
- Redirect errors are detected before the production migration.

This tool is especially useful for SEO migrations where preserving existing URLs is critical.

## Features

- Read redirects from a CSV file
- Verify HTTP status codes
- Validate the `Location` header
- Detect missing or incorrect redirects
- Verify that original-site URLs return successful responses
- Export timestamped CSV reports
- Simple and easy to extend

## Configure inputs

Copy the tracked example files to the local input filenames:

```bash
cp inputs/redirects.csv.example inputs/redirects.csv
cp inputs/urls.csv.example inputs/urls.csv
```

Edit `inputs/redirects.csv` and add the old and new URL paths:

```csv
old_url,new_url
/pilote,/products/pilote
/faq,/pages/faq
/blog/article-1,/blogs/news/article-1
```

Edit `inputs/urls.csv` and set the source and destination domains:

```csv
old_domain,new_domain
heatzy.com,heatzyfr.myshopify.com
```

Redirect checks use `new_domain` for both the requested old path and expected
new path. `old_domain` is reserved for checking the original website's URLs.

## Installation

Install Node.js 18 or newer. This project uses only built-in Node.js APIs, so
there are no package dependencies to install.

```bash
node --version
```

## Usage

Available verification commands:

```bash
npm run verify:redirect # Check redirects on new_domain
npm run verify:original # Check original paths on old_domain
```

### Check Shopify redirects

Run the redirect checker:

```bash
npm run verify:redirect
```

Each run writes a timestamped report to
`reports/verified-redirects-yymmdd-hhmm.csv`. The report includes the requested
URL, expected and actual destinations, match result, redirect result, and HTTP
status code.

Example output:

```text
/pilote
Expected: https://heatzyfr.myshopify.com/products/pilote
Actual: https://heatzyfr.myshopify.com/products/pilote
Status: 301
Match: true
----
```

### Verify original URLs

Check that each `old_url` from `inputs/redirects.csv` returns a `2xx` response
on `old_domain`:

```bash
npm run verify:original
```

This command does not follow redirects: `3xx`, `4xx`, `5xx`, and request
failures are invalid. It writes a timestamped report to
`reports/verified-urls-yymmdd-hhmm.csv` with the domain, path, verification
result, HTTP status code, and warning flags.

Network-level fetch failures are attempted up to three times. HTTP error
responses are not retried. If all attempts fail, `status_code` is `timeout` and
the underlying error is printed with the entry before its `----` separator.

Before making requests, the command checks `old_url` and `new_url` for exact
duplicate values. Every affected row receives the `double-entry` flag and a
flag is printed with that entry's terminal output. Empty cells are ignored;
surrounding whitespace is trimmed, while case, trailing slashes, queries, and
fragments remain meaningful.

## Typical Workflow

1. Export all URLs from the existing website.
2. Build the redirect mapping (`redirects.csv`).
3. Import redirects into Shopify.
4. Run this tool to validate every redirect.
5. Fix any invalid mappings before switching the domain.

## Roadmap

Future improvements may include:

- ✅ Automatic comparison with the expected destination
- ✅ Colored terminal output
- ✅ Export results to CSV or Excel
- ✅ Parallel HTTP requests for faster execution
- ✅ Detection of redirect chains (301 → 301 → 200)
- ✅ Final response validation (HTTP 200)
- ✅ Summary report (Passed / Failed / Missing)

## License

MIT
