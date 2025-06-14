v1.0 - Simple Website using Node.js
===================================

- Follow along instructions:
(these steps have already been run - no need to run them again)
Steps:
1. npm init (all defaults are fine)
2. npm install
3. npm install express
4. create new file app.js
5. app.js has boilerplate express server code


- Instructions to run:
npm install
nodemon app.js

- Git:
add a .gitignore to ignore all files in /node_modules


- To test:
open browser at: https://localhost:3000
You should see Hello World in large print (an <H1> tag)

- Notes:
You can go to the root, but no other sites
You will get an error for example if you go to /about or /login 
  (there's no code to handle these routes)