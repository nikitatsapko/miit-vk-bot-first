let users = require("./database/users.json")
let config = require("./database/config.json")
let tests = require("./database/tests.json")
let literature = require("./database/literature.json")
let package = require("./package.json")
let dotenv = require("dotenv").config()

const { VK, Keyboard, API, Upload, Attachment } = require("vk-io");

const vk = new VK({
    token: config.grouptoken
})

const api = new API({
    token: process.env.TOKEN
})

const upload = new Upload({
    api
})

const { HearManager } = require("@vk-io/hear");
const { QuestionManager } = require('vk-io-question');
const commands = []

const hearManager = new HearManager();
const questionManager = new QuestionManager();

console.log('')
console.log('-------------------------------')
console.log('  Бот УИС-111 | ПЕРВЫЙ ПРОЕКТ запущен.')
console.log('  Разработчик: Никита Цапко')
console.log('  Версия: ' + package.version)

console.log('-------------------------------')
console.log('')

async function saveUsers()
{
	require("fs").writeFileSync("./database/users.json", JSON.stringify(users, null, "\t"))
	console.log("["+getTime()+"] База данных пользователей успешно обновлена.")
	return true
}

async function saveConfig()
{
	require("fs").writeFileSync("./database/settings.json", JSON.stringify(config, null, "\t"))
	return true
}

function getTime() {
	let date = new Date()
	var time=("0"  + date.getHours()).slice(-2)+":"+("0"  + date.getMinutes()).slice(-2)+":"+("0" + date.getSeconds()).slice(-2);
	return time
}

setInterval(async () => {
	await saveUsers()
}, 30000)

vk.updates.on("message_new", async (context, next) => {
	if(!users.find(x=> x.id === context.senderId))
	{
		const [user_info] = await vk.api.users.get({ user_id: context.senderId });
		const date = new Date();

		users.push({
			id: context.senderId,
			uid: (users.length+1),
			regDate: `${date.getDate()}.${date.getMonth()}.${date.getFullYear()}`,
			literature: [false, false, false],
			allowed_tests: [false, false, false],
			tests: [false, false, false]
		});
		console.log(`[${getTime()}] Зарегистрирован новый пользователь. ID: ${users.length}. VK: ${context.senderId}`);
		saveUsers();

		context.state.command = "start"
		return next();
	}
	else {
		const { messagePayload } = context;

	    context.state.command = messagePayload && messagePayload.command
	        ? messagePayload.command
	        : null;

	    return next();
	}
});

//========================

vk.updates.use(questionManager.middleware);
vk.updates.on("message_new", hearManager.middleware);

const hearCommand = (name, conditions, handle) => {
    if (typeof handle !== "function") {
        handle = conditions;
        conditions = [`${name}`, `/${name}`];
    }

    if (!Array.isArray(conditions)) {
        conditions = [conditions];
    }

    hearManager.hear(
        [
            (text, { state }) => (
                state.command === name
            ),
            ...conditions
        ],
        handle
    );
};

hearCommand("start", ["Начать", "start", "/start"], (context, next) => {
    context.state.command = "help";

    return Promise.all([
        context.send("Добро пожаловать!"),

        next()
    ]);
});

hearCommand("help", async (context) => {
    await context.send({
        message: `Выбери нужную тебе команду, нажав на кнопку снизу:

        📕 Теория - литература, которую необходимо изучить
    	⌨ Тесты - список пройденных и доступных для прохождения тестов
        `,
        keyboard: Keyboard.builder()
            .textButton({
                label: "📕 Теория",
                payload: {
                    command: "literature"
                },
                color: Keyboard.POSITIVE_COLOR
            })
            .textButton({
                label: "⌨ Тесты",
                payload: {
                    command: "tests"
                },
                color: Keyboard.PRIMARY_COLOR
            })
    });
});

hearCommand("literature", async (context) => {
	let yes = "✅"
	let no = "❌"
	let user = users.find(x=> x.id === context.senderId)
	text = `Список литературы (изучать можно только по порядку):\n\n`
	keyboard = Keyboard.builder()
	for(i = 0; i < literature.length; i++) {
		if (user.literature[i] == false)
			text += no
		else
			text += yes
		text += " " + literature[i].name + "\n"
	}
	// клавиатура
	for(i = 0; i < literature.length; i++) {
		if (i == 0) {
			// подсветка как непрочитанный
			if(user.literature[i] == false)
				keyboard = keyboard.textButton({
	                label: literature[i].name,
	                payload: {
	                	command: "get_literature",
	                	item: i
	                },
	                color: Keyboard.PRIMARY_COLOR
	            })
			// подсветка как прочитанный
			else
				keyboard = keyboard.textButton({
	                label: literature[i].name,
	                payload: {
	                	command: "get_literature",
	                	item: i
	                },
	                color: Keyboard.POSITIVE_COLOR
	            })
        }
        else if(i > 0) {
        	if (user.literature[i] == false) {
        		// подсветка как непрочитанный
        		if (user.literature[i-1] == true) {
	        		keyboard = keyboard.textButton({
		                label: literature[i].name,
		                payload: {
		                	command: "get_literature",
		                	item: i
		                },
		                color: Keyboard.PRIMARY_COLOR
		            })
		        }
		        // подсветка как недоступный
		        else
		        	keyboard = keyboard.textButton({
		                label: literature[i].name,
		                payload: {
		                	command: "get_literature",
		                	item: i
		                },
		                color: Keyboard.NEGATIVE_COLOR
		            })
        	}
        	// подсветка как прочитанный
        	else
        		keyboard = keyboard.textButton({
	                label: literature[i].name,
	                payload: {
		                command: "get_literature",
		                item: i
		            },
	                color: Keyboard.POSITIVE_COLOR
	            })
        	
        }
	}
	keyboard = keyboard.row().textButton({
        label: "Назад",
        payload: {
        	command: "help"
        },
        color: Keyboard.SECONDARY_COLOR
    })
	
    await Promise.all([
        await context.send({message: text,
        	keyboard: keyboard
        }),
    ]);
});

hearCommand("get_literature", async (context) => {
	let user = users.find(x=> x.id === context.senderId)
	let item = context.messagePayload.item
	if (item != 0) {
		if (user.literature[item-1] == false) {
			let text = `Для прохождения темы "${literature[item].name}" вы должны пройти тему "${literature[item-1].name}"`
			await context.send({message: text,
	        	keyboard: Keyboard.builder().textButton({
			        label: `Перейти к теме "${literature[item-1].name}"`,
			        payload: {
			        	command: "get_literature",
			        	item: item-1
			        },
			        color: Keyboard.POSITIVE_COLOR
			    })
			    .row().textButton({
			        label: "Назад",
			        payload: {
			        	command: "literature"
			        },
			        color: Keyboard.SECONDARY_COLOR
			    })
	        })
	        return false
		}
		if (user.tests[item-1] == false) {
			let text = `Для прохождения темы "${literature[item].name}" вы должны пройти тест №${item}`
			await context.send({message: text,
	        	keyboard: Keyboard.builder().textButton({
			        label: `Перейти к тесту №${item}`,
			        payload: {
			        	command: "go_test",
			        	item: item-1
			        },
			        color: Keyboard.POSITIVE_COLOR
			    })
			    .row().textButton({
			        label: "Назад",
			        payload: {
			        	command: "literature"
			        },
			        color: Keyboard.SECONDARY_COLOR
			    })
	        })
	        return false
		}
	}
	let text = `📖 Материал по теме: ${literature[item].name}${literature[item].text}`
	let doc
	if (literature[item].attachment == null)
		doc = null
	else
		doc = new Attachment({
			type: 'doc',
			payload: {
				id: literature[item].attachment,
				owner_id: -223040072,
			},
		}).toString()
	await Promise.all([
        await context.send({message: text,
        	keyboard: Keyboard.builder().textButton({
		        label: "Отметить прочитанным",
		        payload: {
		        	command: "done_literature",
		        	item: item
		        },
		        color: Keyboard.POSITIVE_COLOR
		    })
		    .row().textButton({
		        label: "Назад",
		        payload: {
		        	command: "literature"
		        },
		        color: Keyboard.SECONDARY_COLOR
		    }), 
			attachment: doc
        }),
    ])
})

hearCommand("done_literature", async (context) => {
	let user = users.find(x=> x.id === context.senderId)
	let item = context.messagePayload.item
	if (item != 0) {
		if (user.literature[item-1] == false) {
			context.send("Ошибка №1")
			return false
		}
		if (user.tests[item-1] == false) {
			context.send("Ошибка №2")
			return false
		}
	}
	keyboard = Keyboard.builder()
	let text = `✅ Материал по теме "${literature[item].name}" изучен. Вы можете перейти к тесту №${item+1}`
	user.allowed_tests[item] = true
	user.literature[item] = true
	saveUsers()
	await Promise.all([
        await context.send({message: text,
        	keyboard: Keyboard.builder().textButton({
	        label: `Перейти к тесту №${item+1}`,
	        payload: {
	        	command: "go_test",
	        	item: item
	        },
	        color: Keyboard.POSITIVE_COLOR
	    })
			.row().textButton({
		        label: "Назад",
		        payload: {
		        	command: "literature"
		        },
		        color: Keyboard.SECONDARY_COLOR
			})
        }),
    ])
})

hearCommand("tests", async (context) => {
	let yes = "✅"
	let no = "❌"
	let user = users.find(x=> x.id === context.senderId)
	text = `Список тестов по темам (проходить можно только по порядку):\n\n`
	for(i = 0; i < tests.length; i++) {
		if (user.tests[i] == false)
			text += no
		else
			text += yes
		//text += ` №${i+1}: ${literature[i].name}\n`
		text += `№${i+1}: ${literature[i].name}\n`
	}
	let keyboard = Keyboard.builder()
	for(i = 0; i < tests.length; i++) {
		if (user.allowed_tests[i] == false)
			keyboard = keyboard.textButton({
		        label: `Тест №${i+1}`,
		        payload: {
		        	command: "go_test",
		        	item: i
		        },
		        color: Keyboard.NEGATIVE_COLOR
		    })
		else 
			if (user.tests[i] == false)
				keyboard = keyboard.textButton({
			        label: `Тест №${i+1}`,
			        payload: {
			        	command: "go_test",
			        	item: i
			        },
			        color: Keyboard.PRIMARY_COLOR
			    })
			else
				keyboard = keyboard.textButton({
			        label: `Тест №${i+1}`,
			        payload: {
			        	command: "go_test",
			        	item: i
			        },
			        color: Keyboard.POSITIVE_COLOR
			    })
	}
	keyboard = keyboard.row().textButton({
        label: "Назад",
        payload: {
        	command: "help"
        },
        color: Keyboard.SECONDARY_COLOR
    })
	await Promise.all([
        await context.send({message: text,
        	keyboard: keyboard
        }),
    ])
})

hearCommand("go_test", async (context) => {
	let user = users.find(x=> x.id === context.senderId)
	let item = context.messagePayload.item
	let text
	let keyboard = Keyboard.builder()
	if (user.tests[item] == true) {
		text = `Вы уже прошли тест №${item+1}. `
		if(item != tests.length-1) {
			text += `Вы можете перейти к следующему`
			keyboard = keyboard.textButton({
		        label: "Следующий тест",
		        payload: {
		        	command: "go_test",
		        	item: item+1
		        },
		        color: Keyboard.PRIMARY_COLOR
		    })
		}
		else {
			text += "\nПоздравляем! Вы прошли весь курс!"
		}
		keyboard = keyboard.row().textButton({
	        label: "Назад",
	        payload: {
	        	command: "tests"
	        },
	        color: Keyboard.SECONDARY_COLOR
	    })
		await Promise.all([
	        await context.send({message: text,
	        	keyboard: keyboard
	        }),
	    ])
		return false
	}
	if (user.allowed_tests[item] == false) {
		text = `Для прохождения теста №${item+1} вы должны пройти тему "${literature[item].name}"`
		keyboard = keyboard.textButton({
	        label: `Перейти к теме "${literature[item].name}"`,
	        payload: {
	        	command: "get_literature",
	        	item: item
	        },
	        color: Keyboard.PRIMARY_COLOR
	    })
	    .row().textButton({
	        label: "Назад",
	        payload: {
	        	command: "tests"
	        },
	        color: Keyboard.SECONDARY_COLOR
	    })
	    await Promise.all([
	        await context.send({message: text,
	        	keyboard: keyboard
	        }),
	    ])
		return false
	}
	let answers = []
	await context.send(`Загрузка теста №${item+1}...`)
	for(i = 0; i < tests[item].questions.length; i++) {
		let text = `❓️ Вопрос №${i+1}: ${tests[item].questions[i]}\n\nВарианты ответов:\n\n`
		let keyboard = Keyboard.builder()
		for(j = 0; j < tests[item].variables[i].length; j++) {
			text += `${j+1}) ${tests[item].variables[i][j]}\n\n`
			let label = (j+1)+". "+tests[item].variables[i][j]
			label = label.slice(0,34);
			if (label.length < tests[item].variables[i][j].length)
				label += '...';
			keyboard = keyboard.row().textButton({
                label: label,
                payload: {
                	item: j
                },
                color: Keyboard.PRIMARY_COLOR
            })
		}
		let answer
		if(tests[item].attachments[i] == null)
			answer = await context.question(text, { keyboard: keyboard })
		else {
			const attachment = await upload.messagePhoto({
			    source: {
			        value: tests[item].attachments[i]
			    }
			})
			answer = await context.question(text, { keyboard: keyboard, attachment })
		}
	    if (!answer.messagePayload) {
	        await context.send('Отвечать нужно нажатием на кнопку.')
	        i--
	        continue
	    }
	    answers.push(answer.messagePayload.item)
	}
	if (answers.length != tests[item].answers.length)
		return context.send("Ошибка №3")
	let pr = 0
	let kol = 0
	let errors = []
	// проверка ответов на правильность
	for(i = 0; i < answers.length; i++) {
		if (Array.isArray(tests[item].answers[i])) {
			if (tests[item].answers[i].some(t => t === answers[i]))
				kol += 1
			else
				errors.push(i)
		}
		else {
			if (answers[i] == tests[item].answers[i])
				kol += 1
			else
				errors.push(i)
		}
	}
	pr = kol / answers.length
	pr_n = Math.ceil(pr * 100)
	if (pr < 0.64) {
		return context.send
		({ 
			message: `❌ Тест не сдан, вы должны его пересдать.\nВы сдали тест на ${pr_n}%.`,
			keyboard: Keyboard.builder().textButton({
		        label: `Перейти к тесту №${item+1}`,
		        payload: {
		        	command: "go_test",
		        	item: item
		        },
		        color: Keyboard.POSITIVE_COLOR
		    })
		    .row().textButton({
		        label: "Назад",
		        payload: {
		        	command: "tests"
		        },
		        color: Keyboard.SECONDARY_COLOR
		    })
		})
	}
	text = `✅ Тест №${item+1} успешно сдан! (${pr_n}%)`
	keyboard = Keyboard.builder()
	if (item < tests.length-1) {
		text += `\nВы можете перейти к изучению следующей темы "${literature[item+1].name}"`
		keyboard = keyboard.textButton({
	        label: `Тема "${literature[item+1].name}"`,
	        payload: {
	        	command: "get_literature",
	        	item: item+1
	        },
	        color: Keyboard.PRIMARY_COLOR
	    })
	}
	else {
		keyboard = keyboard.textButton({
	        label: `Поздравляем! Вы прошли весь курс!`,
	        payload: {
	        	command: "help"
	        },
	        color: Keyboard.POSITIVE_COLOR
	    })
	    text += `\n🥳 Поздравляем! Вы прошли весь курс!`
	}
	if (pr != 1) {
    	text += `\n\nВаши ошибки в тесте: `
    	for(i = 0; i < errors.length; i++) {
    		text += `\n❌ Вопрос №${errors[i]+1}: ${tests[item].questions[errors[i]]}`
    	}
    }
	keyboard = keyboard.row().textButton({
        label: "Назад",
        payload: {
        	command: "tests"
        },
        color: Keyboard.SECONDARY_COLOR
    })
	await context.send({ message: text, keyboard: keyboard })
	user.tests[item] = true
	saveUsers()
})

hearCommand("time", ["/time", "/date"], async (context) => {
    await context.send(String(new Date()));
});

vk.updates.start().catch(console.error);
