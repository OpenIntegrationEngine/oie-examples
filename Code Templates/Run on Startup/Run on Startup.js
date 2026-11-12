// SPDX-FileCopyrightText: 2019 Tony Germano
// SPDX-License-Identifier: MPL-2.0

const isInitialDeploy = (function() {
    const ConfigurationController = com.mirth.connect.server.controllers.ConfigurationController;
    const configurationController = ConfigurationController.getInstance();
    return configurationController.getStatus() == ConfigurationController.STATUS_INITIAL_DEPLOY;
}());
