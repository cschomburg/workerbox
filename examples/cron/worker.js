const STORE = new StorageArea();

 const SECOND = 'SECOND';
 const MINUTE = 'MINUTE';
 const HOUR = 'HOUR';
 const DAY_OF_WEEK = 'DAY_OF_WEEK';
 const DAY_OF_MONTH = 'DAY_OF_MONTH';
 const MONTH = 'MONTH';

class Job {
    schedule = '';
    url = '';
    payload = null;

    constructor(schedule, url, payload = null) {
        this.schedule = schedule;
        this.url = url;
        this.payload = payload;
    }

    getKey() {
        return `${this.schedule} ${this.url}`;
    }
}

class Scheduler {
    schedules = new Map();
    handler = null;

    constructor(handler) {
        this.handler = handler;
    }

    schedule(job) {
        let jobs = this.schedules.get(job.schedule) || new Map();
        jobs.set(job.url, job);
        this.schedules.set(job.schedule, jobs);
    }

    remove(job) {
        let jobs = this.schedules.get(job.schedule);
        if (!jobs) {
            return;
        }

        jobs.delete(job.url, job);
        if (jobs.size === 0) {
            this.schedules.delete(job.schedule);
        }
    }

    executeJobs() {
        const date = new Date();
        this.schedules.forEach((jobs, schedule) => {
            if (validate(schedule, date).didMatch) {
                jobs.forEach((job) => this.handler(job));
            }
        });
    }

    start() {
        setInterval(() => {
            this.executeJobs();
        }, 1000);
    }
}

function isRange(text) {
    return /^\d\d?\-\d\d?$/.test(text);
}

function getRange(min, max) {
    const numRange = [];
    let lowerBound = min;
    while (lowerBound <= max) {
        numRange.push(lowerBound);
        lowerBound += 1;
    }
    return numRange;
}

function getTimePart(date, type) {
    return ({
        [SECOND]: date.getSeconds(),
        [MINUTE]: date.getMinutes(),
        [HOUR]: date.getHours(),
        [MONTH]: date.getMonth() + 1,
        [DAY_OF_WEEK]: date.getDay(),
        [DAY_OF_MONTH]: date.getDate(),
    }[type]);
}

function isMatched(date, timeFlag, type) {
    const timePart = getTimePart(date, type);

    if (timeFlag === '*') {
        return true;
    } else if (Number(timeFlag) === timePart) {
        return true;
    } else if (timeFlag.includes('/')) {
        const [_, executeAt = '1'] = timeFlag.split('/');
        return timePart % Number(executeAt) === 0;
    } else if (timeFlag.includes(',')) {
        const list = timeFlag.split(',').map((num) => parseInt(num));
        return list.includes(timePart);
    } else if (isRange(timeFlag)) {
        const [start, end] = timeFlag.split('-');
        const list = getRange(parseInt(start), parseInt(end));
        return list.includes(timePart);
    }
    return false;
}

function validate(schedule, date = new Date()) {
    const timeObj = {};

    const [
        dayOfWeek,
        month,
        dayOfMonth,
        hour,
        minute,
        second = '01',
    ] = schedule.split(' ').reverse();

    const cronValues = {
        [SECOND]: second,
        [MINUTE]: minute,
        [HOUR]: hour,
        [MONTH]: month,
        [DAY_OF_WEEK]: dayOfWeek,
        [DAY_OF_MONTH]: dayOfMonth,
    };

    for (const key in cronValues) {
        timeObj[key] = isMatched(date, cronValues[key], key);
    }

    const didMatch = Object.values(timeObj).every(Boolean);
    return { didMatch, entries: timeObj };
}

async function handleSchedule(job) {
    console.log(new Date(), 'running job', job.url);
    try {
        await fetch(job.url, {
            method: 'POST',
            body: JSON.stringify(job.payload || {}),
            headers: {
                'content-type': 'application/json',
            },
        });
    } catch (e) {
        console.error(e);
    }
}

const scheduler = new Scheduler(handleSchedule);

async function addJob(job) {
    console.log('adding job', job);
    await STORE.set(job.getKey(), job);
    scheduler.schedule(job);
}

async function removeJob(job) {
    console.log('removing job', job);
    await STORE.delete(job.getKey(), job);
    scheduler.remove(job);
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function parseJob(request) {
    const type = request.headers.get('content-type')
    if (type !== 'application/json') {
        return null;
    }

    let body;
    try {
        body = await request.json();
    } catch (e) {
        console.log(e);
        return null;
    }

    if (!body.url || !body.schedule) {
        return null;
    }

    const job = new Job(body.schedule, body.url, body.payload);

    try {
        validate(job.schedule);
    } catch (e) {
        console.log('could not validate schedule:', job, e);
        return null;
    }

    return job;
}

function respondJSON(data, statusCode = 200) {
    return new Response(JSON.stringify(data, null, 2), {
        status: statusCode,
        headers: {
            "content-type": "application/json;charset=UTF-8",
        }
    })
}

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request) {
    if (request.method === 'POST') {
        const job = await parseJob(request);
        if (!job) {
            return respondJSON({ error: 'Invalid job definition' }, 400);
        }

        await addJob(job);

        return respondJSON({ job});
    } else if (request.method === 'DELETE') {
        const job = await parseJob(request);
        if (!job) {
            return respondJSON({ error: 'Invalid job definition' }, 400);
        }

        await removeJob(job);

        return respondJSON({ job});
    } else {
        const jobs = [];
        for await(const job of STORE.values()) {
            jobs.push(job);
        }

        return respondJSON({ jobs });
    }
}

for await(const jobData of STORE.values()) {
    const job = new Job(jobData.schedule, jobData.url, jobData.payload);
    scheduler.schedule(job);
}

scheduler.start();
