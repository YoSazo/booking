require('dotenv').config();
const axios = require('axios');

const vercelToken = process.env.VERCEL_TOKEN;
const vercelProjectId = process.env.VERCEL_PROJECT_ID;

if (!vercelToken || !vercelProjectId) {
    console.error('❌ VERCEL_TOKEN and VERCEL_PROJECT_ID must be set in your environment/.env file.');
    process.exit(1);
}

async function getProjectDomains() {
    let allDomains = [];
    let hasNext = true;
    let until = null;

    console.log('🔍 Fetching domains from Vercel...');

    while (hasNext) {
        let url = `https://api.vercel.com/v9/projects/${vercelProjectId}/domains?limit=100`;
        if (until) {
            url += `&until=${until}`;
        }

        const res = await axios.get(url, {
            headers: { Authorization: `Bearer ${vercelToken}` }
        });

        const domains = res.data.domains || [];
        allDomains = allDomains.concat(domains);

        if (res.data.pagination && res.data.pagination.next) {
            until = res.data.pagination.next;
        } else {
            hasNext = false;
        }
    }

    return allDomains;
}

async function deleteDomain(domainName) {
    try {
        await axios.delete(
            `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domainName}`,
            { headers: { Authorization: `Bearer ${vercelToken}` } }
        );
        console.log(`  ✅ Successfully deleted: ${domainName}`);
        return true;
    } catch (err) {
        const errMsg = err.response?.data?.error?.message || err.message;
        console.error(`  ❌ Failed to delete ${domainName}: ${errMsg}`);
        return false;
    }
}

async function run() {
    try {
        const domains = await getProjectDomains();
        console.log(`Found total of ${domains.length} domains linked to this project.`);

        const toDelete = domains.filter(d => d.name.endsWith('.bookmarketel.com'));
        console.log(`Identified ${toDelete.length} legacy .bookmarketel.com subdomains to delete.\n`);

        if (toDelete.length === 0) {
            console.log('🎉 No legacy bookmarketel.com subdomains found to delete.');
            return;
        }

        for (const domain of toDelete) {
            console.log(`Deleting: ${domain.name}...`);
            await deleteDomain(domain.name);
            // Sleep slightly to avoid rate limit spikes
            await new Promise(r => setTimeout(r, 200));
        }

        console.log('\n🎉 Finished cleaning up legacy domains!');
    } catch (e) {
        console.error('❌ Error executing domain cleanup:', e.message);
    }
}

run();
