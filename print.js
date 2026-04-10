function printRecord() {

  const content = document.getElementById("app").innerHTML;

  const win = window.open("", "", "width=900,height=700");

  win.document.write(`
    <html>
      <head>
        <title>Medical Report</title>

        <link rel="stylesheet" href="print.css">

      </head>
      <body>

        ${content}

      </body>
    </html>
  `);

  win.document.close();

  win.onload = function(){
    win.print();
  }

}