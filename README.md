# Redirect checker tool

## Description

A lightweight Node.js utility to validate HTTP redirects during a website migration (e.g. Squarespace → Shopify).

The script reads a CSV file containing old and new URL paths, then automatically checks that:

- The old URL returns an HTTP **301** redirect.
- The `Location` header matches the expected destination.
- Redirect errors are detected before the production migration.

This tool is especially useful for SEO migrations where preserving existing URLs is critical.

## Features

- Read redirects from a CSV file
- Verify HTTP status codes
- Validate the `Location` header
- Detect missing or incorrect redirects
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

## Installation

Install Node.js 18 or newer. This project uses only built-in Node.js APIs, so
there are no package dependencies to install.

```bash
node --version
```

## Usage

Run the script:

```bash
npm start
```

Example output:

```text
/pilote
Status: 301
Location: /products/pilote
----

/faq
Status: 301
Location: /pages/faq
----
```

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
