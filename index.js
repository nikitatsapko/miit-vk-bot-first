let users = require("./database/users.json")
let config = require("./database/config.json")
let tests = require("./database/tests.json")
let literature = require("./database/literature.json")

const { VK, Keyboard } = require("vk-io");
const vk = new VK({
    token: config.grouptoken
});
const { HearManager } = require("@vk-io/hear");
const commands = []

const hearManager = new HearManager();

console.log('')
console.log('-------------------------------')
console.log('  Бот УИС-111 | ПЕРВЫЙ ПРОЕКТ запущен.')
console.log('  Разработчик: Никита Цапко')
console.log('  vk.com/nightday13')

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
		                	command: "literature"
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
	let item = context.messagePayload.item
	let text = `📖 Материал по теме: ${literature[item].name} (№${item+1})\n\n${literature[item].text}`
	await Promise.all([
        await context.send({message: text,
        	keyboard: Keyboard.builder().textButton({
		        label: "Отметить прочитанным",
		        payload: {
		        	command: "done_literature"
		        },
		        color: Keyboard.POSITIVE_COLOR
		    })
        }),
    ])
});

hearCommand("tests", async (context) => {
    const link = catsPurring[Math.floor(Math.random() * catsPurring.length)];

    await Promise.all([
        context.send("Wait for the uploads purring 😻"),

        context.sendAudioMessage({
            value: link
        })
    ]);
});

hearCommand("time", ["/time", "/date"], async (context) => {
    await context.send(String(new Date()));
});

const catsPurring = [
    "http://ronsen.org/purrfectsounds/purrs/trip.mp3",
    "http://ronsen.org/purrfectsounds/purrs/maja.mp3",
    "http://ronsen.org/purrfectsounds/purrs/chicken.mp3"
];

hearCommand("purr", async (context) => {
    const link = catsPurring[Math.floor(Math.random() * catsPurring.length)];

    await Promise.all([
        context.send("Wait for the uploads purring 😻"),

        context.sendAudioMessage({
            value: link
        })
    ]);
});

vk.updates.start().catch(console.error);