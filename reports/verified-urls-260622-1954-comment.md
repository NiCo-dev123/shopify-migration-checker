```
npm run verify:original

> migration-checker@0.1.0 verify:original
> node verify-original-urls.js

heatzy.com/pilote
Verified: false
Status: Request failed
Flag: double-entry
----
Error: /pilote fetch failed
heatzy.com/acheter/p/heatzy-pilote
Verified: true
Status: 200
Flag: double-entry
----
heatzy.com/cool
Verified: true
Status: 200
Flag: double-entry
----
heatzy.com/acheter/p/heatzy-cool
Verified: true
Status: 200
Flag: double-entry
----
heatzy.com/pilote-pro
Verified: true
Status: 200
Flag: double-entry
----
heatzy.com/acheter/p/heatzy-pilote-pro
Verified: true
Status: 200
Flag: double-entry
----
heatzy.com/pilote-relais
Verified: true
Status: 200
Flag: double-entry
----
heatzy.com/acheter/p/heatzy-pilote-relais
Verified: true
Status: 200
Flag: double-entry
----
heatzy.com/survoltage
Verified: true
Status: 200
----
heatzy.com/ecosysteme
Verified: false
Status: Request failed
----
Error: /ecosysteme fetch failed
heatzy.com/faq-pilote
Verified: true
Status: 200
----
heatzy.com/faq-pilote-pro
Verified: true
Status: 200
----
heatzy.com/faq-cool
Verified: true
Status: 200
----
Report written to /home/nicolas/Heatzy/Dev/migration-checker/reports/verified-urls-260622-1954.csv
```

1. Why did some fetch fail ?
2. I don't see any status error, also no status error in the csv
3. The log shows the error after the --- separator, not really good

your answers here :

1. fetch failed means Node received no HTTP response—likely a transient socket, TLS, or connection issue. Since other URLs on the same domain succeeded, it probably isn’t an invalid URL. The exact cause is hidden in error.cause, which we currently don’t record.

2. There is no status code because the server never returned a response. Leaving status_code blank is accurate, but the report should add an error column and probably a request-error flag.

3. Agreed. The error is logged separately after printResult(), which already prints ----. It should be included in the entry before the separator.
