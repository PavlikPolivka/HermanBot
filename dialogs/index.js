var builder = require('botbuilder');
var prompts = require('../prompts');

/** Return a LuisDialog that points at our model and then add intent handlers. */
var model = process.env.model || 'https://api.projectoxford.ai/luis/v1/application?id=a11d4b2e-6f0c-4621-a1f5-4c877990f280&subscription-key=7779c20d76174a8f8df407b1386f0c54';
var dialog = new builder.LuisDialog(model);
module.exports = dialog;

/** Answer users help requests. We can use a DialogAction to send a static message. */
dialog.on('Help', builder.DialogAction.send(prompts.helpMessage));

/** Prompts a user for the title of the task and saves it.  */
dialog.on('SaveTask', [
    function (session, args, next) {
        // See if got the tasks title from our LUIS model.
        var title = builder.EntityRecognizer.findEntity(args.entities, 'TaskTitle');
        if (!title) {
            // Prompt user to enter title.
            builder.Prompts.text(session, prompts.saveTaskMissing);
        } else {
            // Pass title to next step.
            next({ response: title.entity });
        }
    },
    function (session, results) {
        // Save the task
        if (results.response) {
            if (!session.userData.tasks) {
                session.userData.tasks = [results.response];
            } else {
                session.userData.tasks.push(results.response);
            }
            session.send(prompts.saveTaskCreated, { task: results.response });
        } else {
            session.send(prompts.canceled);
        }
    }
]);

/** Prompts the user for the task to delete and then removes it. */
dialog.on('FinishTask', [
    function (session, args, next) {
        // Do we have any tasks?
        if (session.userData.tasks && session.userData.tasks.length > 0) {
            // See if got the tasks title from our LUIS model.
            var topTask;
            var title = builder.EntityRecognizer.findEntity(args.entities, 'TaskTitle');
            if (title) {
                // Find it in our list of tasks
                topTask = builder.EntityRecognizer.findBestMatch(session.userData.tasks, title.entity);
            }

            // Prompt user if task missing or not found
            if (!topTask) {
                builder.Prompts.choice(session, prompts.finishTaskMissing, session.userData.tasks);
            } else {
                next({ response: topTask });
            }
        } else {
            session.send(prompts.listNoTasks);
        }
    },
    function (session, results) {
        if (results && results.response) {
            session.userData.tasks.splice(results.response.index, 1);
            session.send(prompts.finishTaskDone, { task: results.response.entity });
        } else {
            session.send(prompts.canceled);
        }
    }
]);

/** Shows the user a list of tasks. */
dialog.on('ListTasks', function (session) {
    if (session.userData.tasks && session.userData.tasks.length > 0) {
        var list = '';
        session.userData.tasks.forEach(function (value, index) {
            list += session.gettext(prompts.listTaskItem, { index: index + 1, task: value });
        });
        session.send(prompts.listTaskList, list);
    }
    else {
        session.send(prompts.listNoTasks);
    }
});
