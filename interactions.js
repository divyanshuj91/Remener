const { EmbedBuilder } = require("discord.js");

async function handleInteraction(interaction) {
  if (!interaction.isButton()) return;

  const { customId, user, message } = interaction;

  try {
    if (customId.startsWith("claim_issue_")) {
      await handleClaimIssue(interaction, user, message);
    } else if (customId.startsWith("review_pr_")) {
      await handleReviewPR(interaction, user, message);
    }
  } catch (err) {
    console.error("[Interaction] Error:", err.message);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Something went wrong.", ephemeral: true });
    }
  }
}

async function handleClaimIssue(interaction, user, message) {
  const embed = EmbedBuilder.from(message.embeds[0]);
  const assignedField = embed.data.fields?.find((f) => f.name === "🙋 Assigned To");

  if (!assignedField) {
    return interaction.reply({ content: "Could not find the assignment field.", ephemeral: true });
  }

  if (assignedField.value.includes(user.id)) {
    return interaction.reply({ content: "You've already claimed this issue!", ephemeral: true });
  }

  const isUnclaimed = assignedField.value.includes("Unclaimed");
  assignedField.value = isUnclaimed
    ? `<@${user.id}>`
    : `${assignedField.value}, <@${user.id}>`;

  await message.edit({ embeds: [embed], components: message.components });
  await interaction.reply(`✅ **${user.displayName}** is taking this issue!`);
}

async function handleReviewPR(interaction, user, message) {
  const embed = EmbedBuilder.from(message.embeds[0]);
  const reviewerField = embed.data.fields?.find((f) => f.name === "👀 Reviewers");

  if (!reviewerField) {
    return interaction.reply({ content: "Could not find the reviewer field.", ephemeral: true });
  }

  if (reviewerField.value.includes(user.id)) {
    return interaction.reply({ content: "You're already reviewing this PR!", ephemeral: true });
  }

  const isEmpty = reviewerField.value.includes("No reviewers yet");
  reviewerField.value = isEmpty
    ? `<@${user.id}>`
    : `${reviewerField.value}, <@${user.id}>`;

  await message.edit({ embeds: [embed], components: message.components });
  await interaction.reply(`✅ **${user.displayName}** is reviewing this PR!`);
}

module.exports = { handleInteraction };
