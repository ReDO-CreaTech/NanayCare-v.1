function printRecord() {
  const content = document.getElementById("app").innerHTML;

  const win = window.open("", "", "width=800,height=600");

  win.document.write(`
    <html>
      <head>
        <title>Medical Report</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          h2 { color: #2563eb; }
          .section { margin-top: 16px; }
          .result { border-left: 4px solid #000; padding-left: 10px; margin-top: 10px; }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `);

  win.document.close();
  win.print();
}