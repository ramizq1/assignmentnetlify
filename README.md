# ITPM Assignment Due Dates

Static site (`public/`) plus one Netlify Function (`netlify/functions/assignments.mjs`) that stores new assignments in Netlify Blobs.

- Starting assignments are in `public/assignments.json`. Edit that file to change them.
- Assignments added through the **Add an assignment** form are saved by the function and show up for everyone on refresh.
- Any assignment can be deleted with the trash button on its card. Deleting also needs the password.
- `history.html` lists assignments whose due date has passed, grouped by month. Deleted ones don't appear there.
- Adding and deleting only work if the password is `itpm`. The server checks it, not the browser. To change it, set the `ASSIGNMENT_PASSWORD` environment variable in Netlify.

## Deploy

Drag-and-drop (Netlify Drop) only uploads static files. It does **not** run the function, so the form would not save. Use one of these:

**Option A: Netlify CLI**

```bash
npm install
npx netlify-cli deploy --prod
```

**Option B: Git**

Push this folder to a GitHub repo, then in Netlify choose **Add new site → Import an existing project**. The settings in `netlify.toml` are picked up automatically.
