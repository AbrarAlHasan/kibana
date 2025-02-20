/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from '@kbn/expect';
import { parse } from 'url';
import { enableInfrastructureHostsView } from '@kbn/observability-plugin/common';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES, HOSTS_LINK_LOCAL_STORAGE_KEY, HOSTS_VIEW_PATH } from './constants';

const START_DATE = moment.utc(DATES.metricsAndLogs.hosts.min);
const END_DATE = moment.utc(DATES.metricsAndLogs.hosts.max);
const START_HOST_PROCESSES_DATE = moment.utc(DATES.metricsAndLogs.hosts.processesDataStartDate);
const END_HOST_PROCESSES_DATE = moment.utc(DATES.metricsAndLogs.hosts.processesDataEndDate);
const timepickerFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';

const tableEntries = [
  {
    title: 'demo-stack-apache-01',
    cpuUsage: '1.2%',
    diskLatency: '1.6 ms',
    rx: '0 bit/s',
    tx: '0 bit/s',
    memoryTotal: '3.9 GB',
    memory: '18.4%',
  },
  {
    title: 'demo-stack-client-01',
    cpuUsage: '0.5%',
    diskLatency: '8.7 ms',
    rx: '0 bit/s',
    tx: '0 bit/s',
    memoryTotal: '3.9 GB',
    memory: '13.8%',
  },
  {
    title: 'demo-stack-haproxy-01',
    cpuUsage: '0.8%',
    diskLatency: '7 ms',
    rx: '0 bit/s',
    tx: '0 bit/s',
    memoryTotal: '3.9 GB',
    memory: '16.5%',
  },
  {
    title: 'demo-stack-mysql-01',
    cpuUsage: '0.9%',
    diskLatency: '6.6 ms',
    rx: '0 bit/s',
    tx: '0 bit/s',
    memoryTotal: '3.9 GB',
    memory: '18.2%',
  },
  {
    title: 'demo-stack-nginx-01',
    cpuUsage: '0.8%',
    diskLatency: '5.7 ms',
    rx: '0 bit/s',
    tx: '0 bit/s',
    memoryTotal: '3.9 GB',
    memory: '18%',
  },
  {
    title: 'demo-stack-redis-01',
    cpuUsage: '0.8%',
    diskLatency: '6.3 ms',
    rx: '0 bit/s',
    tx: '0 bit/s',
    memoryTotal: '3.9 GB',
    memory: '15.9%',
  },
];

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const observability = getService('observability');
  const retry = getService('retry');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects([
    'common',
    'infraHome',
    'timePicker',
    'infraHostsView',
    'security',
    'settings',
    'header',
  ]);

  // Helpers
  const setHostViewEnabled = (value: boolean = true) =>
    kibanaServer.uiSettings.update({ [enableInfrastructureHostsView]: value });

  const loginWithReadOnlyUser = async () => {
    const roleCreation = await security.role.create('global_hosts_read_privileges_role', {
      elasticsearch: {
        indices: [{ names: ['metricbeat-*'], privileges: ['read', 'view_index_metadata'] }],
      },
      kibana: [
        {
          feature: {
            infrastructure: ['read'],
            advancedSettings: ['read'],
          },
          spaces: ['*'],
        },
      ],
    });

    const userCreation = security.user.create('global_hosts_read_privileges_user', {
      password: 'global_hosts_read_privileges_user-password',
      roles: ['global_hosts_read_privileges_role'],
      full_name: 'test user',
    });

    await Promise.all([roleCreation, userCreation]);

    await pageObjects.security.forceLogout();
    await pageObjects.security.login(
      'global_hosts_read_privileges_user',
      'global_hosts_read_privileges_user-password',
      {
        expectSpaceSelector: false,
      }
    );
  };

  const logoutAndDeleteReadOnlyUser = () =>
    Promise.all([
      pageObjects.security.forceLogout(),
      security.role.delete('global_hosts_read_privileges_role'),
      security.user.delete('global_hosts_read_privileges_user'),
    ]);

  const returnTo = async (path: string, timeout = 2000) =>
    retry.waitForWithTimeout('returned to hosts view', timeout, async () => {
      await browser.goBack();
      const currentUrl = await browser.getCurrentUrl();
      return !!currentUrl.match(path);
    });

  describe('Hosts View', function () {
    before(async () => {
      await Promise.all([
        esArchiver.load('x-pack/test/functional/es_archives/infra/alerts'),
        esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs'),
        esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_hosts_processes'),
        kibanaServer.savedObjects.cleanStandardList(),
      ]);
      await browser.setWindowSize(1600, 1200);
    });

    after(async () => {
      await Promise.all([
        esArchiver.unload('x-pack/test/functional/es_archives/infra/alerts'),
        esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'),
        esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_hosts_processes'),
        browser.removeLocalStorageItem(HOSTS_LINK_LOCAL_STORAGE_KEY),
      ]);
    });

    it('should be accessible from the Inventory page', async () => {
      await pageObjects.common.navigateToApp('infraOps');

      await pageObjects.infraHome.clickDismissKubernetesTourButton();
      await pageObjects.infraHostsView.clickTryHostViewBadge();

      const pageUrl = await browser.getCurrentUrl();

      expect(pageUrl).to.contain(HOSTS_VIEW_PATH);
    });

    describe('#Landing page', () => {
      beforeEach(async () => {
        await setHostViewEnabled(false);
      });

      afterEach(async () => {
        await setHostViewEnabled(true);
      });

      describe('User with read permission', () => {
        beforeEach(async () => {
          await loginWithReadOnlyUser();
          await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
          await pageObjects.header.waitUntilLoadingHasFinished();
        });

        afterEach(async () => {
          await logoutAndDeleteReadOnlyUser();
        });

        it('Should show hosts landing page with callout when the hosts view is disabled', async () => {
          const landingPageDisabled =
            await pageObjects.infraHostsView.getHostsLandingPageDisabled();
          const learnMoreDocsUrl = await pageObjects.infraHostsView.getHostsLandingPageDocsLink();
          const parsedUrl = new URL(learnMoreDocsUrl);

          expect(parsedUrl.host).to.be('www.elastic.co');
          expect(parsedUrl.pathname).to.be('/guide/en/kibana/current/kibana-privileges.html');
          expect(landingPageDisabled).to.contain(
            'Your user role doesn’t have sufficient privileges to enable this feature'
          );
        });
      });

      describe('Admin user', () => {
        beforeEach(async () => {
          await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
          await pageObjects.header.waitUntilLoadingHasFinished();
        });

        it('as an admin, should see an enable button when the hosts view is disabled', async () => {
          const landingPageEnableButton =
            await pageObjects.infraHostsView.getHostsLandingPageEnableButton();
          const landingPageEnableButtonText = await landingPageEnableButton.getVisibleText();
          expect(landingPageEnableButtonText).to.eql('Enable hosts view');
        });

        it('as an admin, should be able to enable the hosts view feature', async () => {
          await pageObjects.infraHostsView.clickEnableHostViewButton();

          const titleElement = await find.byCssSelector('h1');
          const title = await titleElement.getVisibleText();

          expect(title).to.contain('Hosts');
        });
      });
    });

    describe('#Single host Flyout', () => {
      before(async () => {
        await setHostViewEnabled(true);
        await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await pageObjects.timePicker.setAbsoluteRange(
          START_HOST_PROCESSES_DATE.format(timepickerFormat),
          END_HOST_PROCESSES_DATE.format(timepickerFormat)
        );
      });

      beforeEach(async () => {
        await pageObjects.infraHostsView.clickTableOpenFlyoutButton();
      });

      afterEach(async () => {
        await retry.try(async () => {
          await pageObjects.infraHostsView.clickCloseFlyoutButton();
        });
      });

      it('should render metadata tab, add and remove filter', async () => {
        const metadataTab = await pageObjects.infraHostsView.getMetadataTabName();
        expect(metadataTab).to.contain('Metadata');

        await pageObjects.infraHostsView.clickAddMetadataFilter();
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Add Filter
        const addedFilter = await pageObjects.infraHostsView.getAppliedFilter();
        expect(addedFilter).to.contain('host.architecture: arm64');
        const removeFilterExists = await pageObjects.infraHostsView.getRemoveFilterExist();
        expect(removeFilterExists).to.be(true);

        // Remove filter
        await pageObjects.infraHostsView.clickRemoveMetadataFilter();
        await pageObjects.header.waitUntilLoadingHasFinished();
        const removeFilterShouldNotExist = await pageObjects.infraHostsView.getRemoveFilterExist();
        expect(removeFilterShouldNotExist).to.be(false);
      });

      it('should navigate to Uptime after click', async () => {
        await pageObjects.infraHostsView.clickFlyoutUptimeLink();
        const url = parse(await browser.getCurrentUrl());

        const search = 'search=host.name: "Jennys-MBP.fritz.box" OR host.ip: "192.168.1.79"';
        const query = decodeURIComponent(url.query ?? '');

        expect(url.pathname).to.eql('/app/uptime/');
        expect(query).to.contain(search);

        await returnTo(HOSTS_VIEW_PATH);
      });

      it('should navigate to APM services after click', async () => {
        await pageObjects.infraHostsView.clickFlyoutApmServicesLink();
        const url = parse(await browser.getCurrentUrl());

        const query = decodeURIComponent(url.query ?? '');

        const environment = 'environment=ENVIRONMENT_ALL';
        const kuery = 'kuery=host.hostname:"Jennys-MBP.fritz.box"';
        const rangeFrom = 'rangeFrom=2023-03-28T18:20:00.000Z';
        const rangeTo = 'rangeTo=2023-03-28T18:21:00.000Z';

        expect(url.pathname).to.eql('/app/apm/services');
        expect(query).to.contain(environment);
        expect(query).to.contain(kuery);
        expect(query).to.contain(rangeFrom);
        expect(query).to.contain(rangeTo);

        await returnTo(HOSTS_VIEW_PATH);
      });

      it('should render processes tab and with Total Value summary', async () => {
        await pageObjects.infraHostsView.clickProcessesFlyoutTab();
        const processesTotalValue =
          await pageObjects.infraHostsView.getProcessesTabContentTotalValue();
        const processValue = await processesTotalValue.getVisibleText();
        expect(processValue).to.eql('313');
      });

      it('should expand processes table row', async () => {
        await pageObjects.infraHostsView.clickProcessesFlyoutTab();
        await pageObjects.infraHostsView.getProcessesTable();
        await pageObjects.infraHostsView.getProcessesTableBody();
        await pageObjects.infraHostsView.clickProcessesTableExpandButton();
      });
    });

    describe('#Page Content', () => {
      before(async () => {
        await setHostViewEnabled(true);
        await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await pageObjects.timePicker.setAbsoluteRange(
          START_DATE.format(timepickerFormat),
          END_DATE.format(timepickerFormat)
        );

        await retry.waitFor(
          'wait for table and KPI charts to load',
          async () =>
            (await pageObjects.infraHostsView.isHostTableLoading()) &&
            (await pageObjects.infraHostsView.isKPIChartsLoaded())
        );
      });

      it('should render the correct page title', async () => {
        const documentTitle = await browser.getTitle();
        expect(documentTitle).to.contain('Hosts - Infrastructure - Observability - Elastic');
      });

      describe('Hosts table', async () => {
        let hostRows: WebElementWrapper[] = [];

        before(async () => {
          hostRows = await pageObjects.infraHostsView.getHostsTableData();
        });

        it('should render a table with 6 hosts', async () => {
          expect(hostRows.length).to.equal(6);
        });

        it('should render the computed metrics for each host entry', async () => {
          hostRows.forEach((row, position) => {
            pageObjects.infraHostsView
              .getHostsRowData(row)
              .then((hostRowData) => expect(hostRowData).to.eql(tableEntries[position]));
          });
        });
      });

      it('should render "N/A" when processes summary is not available in flyout', async () => {
        await pageObjects.infraHostsView.clickTableOpenFlyoutButton();
        await pageObjects.infraHostsView.clickProcessesFlyoutTab();
        const processesTotalValue =
          await pageObjects.infraHostsView.getProcessesTabContentTotalValue();
        const processValue = await processesTotalValue.getVisibleText();
        expect(processValue).to.eql('N/A');
        await pageObjects.infraHostsView.clickCloseFlyoutButton();
      });

      describe('KPI tiles', () => {
        it('should render 5 metrics trend tiles', async () => {
          const hosts = await pageObjects.infraHostsView.getAllKPITiles();
          expect(hosts.length).to.equal(5);
        });

        [
          { metric: 'hostsCount', value: '6' },
          { metric: 'cpu', value: '0.8%' },
          { metric: 'memory', value: '16.81%' },
          { metric: 'tx', value: 'N/A' },
          { metric: 'rx', value: 'N/A' },
        ].forEach(({ metric, value }) => {
          it(`${metric} tile should show ${value}`, async () => {
            await retry.try(async () => {
              const tileValue = await pageObjects.infraHostsView.getKPITileValue(metric);
              expect(tileValue).to.eql(value);
            });
          });
        });
      });

      describe('Metrics Tab', () => {
        before(async () => {
          await browser.scrollTop();
          await pageObjects.infraHostsView.visitMetricsTab();
        });

        after(async () => {
          await browser.scrollTop();
        });

        it('should load 8 lens metric charts', async () => {
          const metricCharts = await pageObjects.infraHostsView.getAllMetricsCharts();
          expect(metricCharts.length).to.equal(8);
        });

        it('should have an option to open the chart in lens', async () => {
          await pageObjects.infraHostsView.clickAndValidateMetriChartActionOptions();
        });
      });

      describe('Logs Tab', () => {
        before(async () => {
          await browser.scrollTop();
          await pageObjects.infraHostsView.visitLogsTab();
        });

        after(async () => {
          await browser.scrollTop();
        });

        it('should load the Logs tab section when clicking on it', async () => {
          await testSubjects.existOrFail('hostsView-logs');
        });
      });

      describe('Alerts Tab', () => {
        const ACTIVE_ALERTS = 6;
        const RECOVERED_ALERTS = 4;
        const ALL_ALERTS = ACTIVE_ALERTS + RECOVERED_ALERTS;
        const COLUMNS = 6;

        before(async () => {
          await browser.scrollTop();
          await pageObjects.infraHostsView.visitAlertTab();
        });

        after(async () => {
          await browser.scrollTop();
        });

        it('should correctly load the Alerts tab section when clicking on it', async () => {
          testSubjects.existOrFail('hostsView-alerts');
        });

        it('should correctly render a badge with the active alerts count', async () => {
          const alertsCount = await pageObjects.infraHostsView.getAlertsCount();

          expect(alertsCount).to.be('6');
        });

        describe('#FilterButtonGroup', () => {
          it('can be filtered to only show "all" alerts using the filter button', async () => {
            await pageObjects.infraHostsView.setAlertStatusFilter();
            await retry.try(async () => {
              const tableRows = await observability.alerts.common.getTableCellsInRows();
              expect(tableRows.length).to.be(ALL_ALERTS);
            });
          });

          it('can be filtered to only show "active" alerts using the filter button', async () => {
            await pageObjects.infraHostsView.setAlertStatusFilter(ALERT_STATUS_ACTIVE);
            await retry.try(async () => {
              const tableRows = await observability.alerts.common.getTableCellsInRows();
              expect(tableRows.length).to.be(ACTIVE_ALERTS);
            });
          });

          it('can be filtered to only show "recovered" alerts using the filter button', async () => {
            await pageObjects.infraHostsView.setAlertStatusFilter(ALERT_STATUS_RECOVERED);
            await retry.try(async () => {
              const tableRows = await observability.alerts.common.getTableCellsInRows();
              expect(tableRows.length).to.be(RECOVERED_ALERTS);
            });
          });
        });

        describe('#AlertsTable', () => {
          it('should correctly render', async () => {
            await observability.alerts.common.getTableOrFail();
          });

          it('should renders the correct number of cells', async () => {
            await pageObjects.infraHostsView.setAlertStatusFilter();
            await retry.try(async () => {
              const cells = await observability.alerts.common.getTableCells();
              expect(cells.length).to.be(ALL_ALERTS * COLUMNS);
            });
          });
        });
      });

      describe('Search Query', () => {
        const filtererEntries = tableEntries.slice(0, 3);

        const query = filtererEntries.map((entry) => `host.name :"${entry.title}"`).join(' or ');

        before(async () => {
          await browser.scrollTop();
          await pageObjects.infraHostsView.submitQuery(query);
          await retry.waitFor(
            'wait for table and KPI charts to load',
            async () =>
              (await pageObjects.infraHostsView.isHostTableLoading()) &&
              (await pageObjects.infraHostsView.isKPIChartsLoaded())
          );
        });

        after(async () => {
          await browser.scrollTop();
          await pageObjects.infraHostsView.submitQuery('');
        });

        it('should filter the table content on a search submit', async () => {
          const hostRows = await pageObjects.infraHostsView.getHostsTableData();

          expect(hostRows.length).to.equal(3);

          hostRows.forEach((row, position) => {
            pageObjects.infraHostsView
              .getHostsRowData(row)
              .then((hostRowData) => expect(hostRowData).to.eql(filtererEntries[position]));
          });
        });

        it('should update the KPIs content on a search submit', async () => {
          await Promise.all(
            [
              { metric: 'hostsCount', value: '3' },
              { metric: 'cpu', value: '0.8%' },
              { metric: 'memory', value: '16.25%' },
              { metric: 'tx', value: 'N/A' },
              { metric: 'rx', value: 'N/A' },
            ].map(async ({ metric, value }) => {
              await retry.try(async () => {
                const tileValue = await pageObjects.infraHostsView.getKPITileValue(metric);
                expect(tileValue).to.eql(value);
              });
            })
          );
        });

        it('should update the alerts count on a search submit', async () => {
          const alertsCount = await pageObjects.infraHostsView.getAlertsCount();

          expect(alertsCount).to.be('2');
        });

        it('should update the alerts table content on a search submit', async () => {
          const ACTIVE_ALERTS = 2;
          const RECOVERED_ALERTS = 2;
          const ALL_ALERTS = ACTIVE_ALERTS + RECOVERED_ALERTS;
          const COLUMNS = 6;

          await pageObjects.infraHostsView.visitAlertTab();

          await pageObjects.infraHostsView.setAlertStatusFilter();
          await retry.try(async () => {
            const cells = await observability.alerts.common.getTableCells();
            expect(cells.length).to.be(ALL_ALERTS * COLUMNS);
          });
        });

        it('should show an error message when an invalid KQL is submitted', async () => {
          await pageObjects.infraHostsView.submitQuery('cloud.provider="gcp" A');
          await testSubjects.existOrFail('hostsViewErrorCallout');
        });
      });

      describe('Pagination and Sorting', () => {
        before(async () => {
          await browser.scrollTop();
        });

        after(async () => {
          await browser.scrollTop();
        });

        beforeEach(async () => {
          await retry.try(async () => {
            await pageObjects.infraHostsView.changePageSize(5);
          });
        });

        it('should show 5 rows on the first page', async () => {
          const hostRows = await pageObjects.infraHostsView.getHostsTableData();
          hostRows.forEach((row, position) => {
            pageObjects.infraHostsView
              .getHostsRowData(row)
              .then((hostRowData) => expect(hostRowData).to.eql(tableEntries[position]));
          });
        });

        it('should paginate to the last page', async () => {
          await pageObjects.infraHostsView.paginateTo(2);
          const hostRows = await pageObjects.infraHostsView.getHostsTableData();
          hostRows.forEach((row) => {
            pageObjects.infraHostsView
              .getHostsRowData(row)
              .then((hostRowData) => expect(hostRowData).to.eql(tableEntries[5]));
          });
        });

        it('should show all hosts on the same page', async () => {
          await pageObjects.infraHostsView.changePageSize(10);
          const hostRows = await pageObjects.infraHostsView.getHostsTableData();
          hostRows.forEach((row, position) => {
            pageObjects.infraHostsView
              .getHostsRowData(row)
              .then((hostRowData) => expect(hostRowData).to.eql(tableEntries[position]));
          });
        });

        it('should sort by Disk Latency asc', async () => {
          await pageObjects.infraHostsView.sortByDiskLatency();
          let hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataFirtPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataFirtPage).to.eql(tableEntries[0]);

          await pageObjects.infraHostsView.paginateTo(2);
          hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataLastPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataLastPage).to.eql(tableEntries[1]);
        });

        it('should sort by Disk Latency desc', async () => {
          await pageObjects.infraHostsView.sortByDiskLatency();
          let hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataFirtPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataFirtPage).to.eql(tableEntries[1]);

          await pageObjects.infraHostsView.paginateTo(2);
          hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataLastPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataLastPage).to.eql(tableEntries[0]);
        });

        it('should sort by Title asc', async () => {
          await pageObjects.infraHostsView.sortByTitle();
          let hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataFirtPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataFirtPage).to.eql(tableEntries[0]);

          await pageObjects.infraHostsView.paginateTo(2);
          hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataLastPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataLastPage).to.eql(tableEntries[5]);
        });

        it('should sort by Title desc', async () => {
          await pageObjects.infraHostsView.sortByTitle();
          let hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataFirtPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataFirtPage).to.eql(tableEntries[5]);

          await pageObjects.infraHostsView.paginateTo(2);
          hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataLastPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataLastPage).to.eql(tableEntries[0]);
        });
      });
    });
  });
};
