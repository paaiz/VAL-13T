const Event = require('../../Structures/Event');
const { MessageEmbed, WebhookClient, Guild } = require('discord.js');
const guildSchema = require('../../Structures/Database/Schema/GuildSchema');

module.exports = class extends Event {
	/**
	 *
	 * @param {Guild} guild
	 */
	async run(guild) {
		try {
			await guildSchema.findOneAndDelete({ guildId: guild.id });

			const webhookClient = new WebhookClient({
				url: process.env.LEAVE_WEBHOOK,
			});
			const timestamp = Math.floor(Date.now() / 1000);

			const embed = new MessageEmbed()
				.setAuthor({
					name: `${this.client.user.username} has left a Server!`,
					iconURL: guild.iconURL({ dynamic: true }) ? guild.iconURL({ dynamic: true }) : null,
				})
				.setColor('RED')
				.setThumbnail(guild.iconURL({ dynamic: true }) ? guild.iconURL({ dynamic: true }) : null)
				.setDescription(`Left Date: <t:${timestamp}>`)
				.addField('Guild Name', `${guild.name} (${guild.id})`)
				.addField('Guild Owner', `[${(await guild.fetchOwner()).user.tag}] (${guild.ownerId})`, true)
				.addField('Guild Members', `${guild.memberCount}`, true);
			webhookClient.send({ embeds: [embed] });
		} catch (err) {
			this.client.logger.err(`[EVENT-guildDelete] - ${err.message}`);
		}
	}
};
