/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core/server';
import { ConfigKey, MonitorFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';

export default function ({ getService }: FtrProviderContext) {
  describe('getSyntheticsMonitors', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');

    let _monitors: MonitorFields[];
    let monitors: MonitorFields[];

    const saveMonitor = async (monitor: MonitorFields) => {
      const res = await supertest
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(monitor)
        .expect(200);

      return res.body as SavedObject<MonitorFields>;
    };

    before(async () => {
      await supertest.put(API_URLS.SYNTHETICS_ENABLEMENT).set('kbn-xsrf', 'true').expect(200);

      _monitors = [
        getFixtureJson('icmp_monitor'),
        getFixtureJson('tcp_monitor'),
        getFixtureJson('http_monitor'),
        getFixtureJson('browser_monitor'),
      ];
    });

    beforeEach(() => {
      monitors = _monitors;
    });

    describe('get many monitors', () => {
      it('without params', async () => {
        const [{ id: id1, attributes: mon1 }, { id: id2, attributes: mon2 }] = await Promise.all(
          monitors.map(saveMonitor)
        );

        const apiResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS + '?perPage=1000') // 1000 to sort of load all saved monitors
          .expect(200);

        const found: Array<SavedObject<MonitorFields>> = apiResponse.body.monitors.filter(
          ({ id }: SavedObject<MonitorFields>) => [id1, id2].includes(id)
        );
        found.sort(({ id: a }) => (a === id2 ? 1 : a === id1 ? -1 : 0));
        const foundMonitors = found.map(({ attributes }: SavedObject<MonitorFields>) => attributes);

        const expected = [mon1, mon2];

        expect(foundMonitors).eql(expected);
      });

      it('with page params', async () => {
        await Promise.all([...monitors, ...monitors].map(saveMonitor));

        const firstPageResp = await supertest
          .get(`${API_URLS.SYNTHETICS_MONITORS}?page=1&perPage=2`)
          .expect(200);
        const secondPageResp = await supertest
          .get(`${API_URLS.SYNTHETICS_MONITORS}?page=2&perPage=3`)
          .expect(200);

        expect(firstPageResp.body.total).greaterThan(6);
        expect(firstPageResp.body.monitors.length).eql(2);
        expect(secondPageResp.body.monitors.length).eql(3);

        expect(firstPageResp.body.monitors[0].id).not.eql(secondPageResp.body.monitors[0].id);
      });

      it('with single monitorQueryId filter', async () => {
        const [_, { id: id2 }] = await Promise.all(monitors.map(saveMonitor));

        const resp = await supertest
          .get(`${API_URLS.SYNTHETICS_MONITORS}?page=1&perPage=10&monitorQueryIds=${id2}`)
          .expect(200);

        const resultMonitorIds = resp.body.monitors.map(
          ({ attributes: { id } }: { attributes: Partial<MonitorFields> }) => id
        );
        expect(resultMonitorIds.length).eql(1);
        expect(resultMonitorIds).eql([id2]);
      });

      it('with multiple monitorQueryId filter', async () => {
        const [_, { id: id2 }, { id: id3 }] = await Promise.all(monitors.map(saveMonitor));

        const resp = await supertest
          .get(
            `${API_URLS.SYNTHETICS_MONITORS}?page=1&perPage=10&sortField=name.keyword&sortOrder=asc&monitorQueryIds=${id2}&monitorQueryIds=${id3}`
          )
          .expect(200);

        const resultMonitorIds = resp.body.monitors.map(
          ({ attributes: { id } }: { attributes: Partial<MonitorFields> }) => id
        );

        expect(resultMonitorIds.length).eql(2);
        expect(resultMonitorIds).eql([id2, id3]);
      });

      it('monitorQueryId respects custom_heartbeat_id while filtering', async () => {
        const customHeartbeatId0 = 'custom-heartbeat-id-test-01';
        const customHeartbeatId1 = 'custom-heartbeat-id-test-02';
        await Promise.all(
          [
            {
              ...monitors[0],
              [ConfigKey.CUSTOM_HEARTBEAT_ID]: customHeartbeatId0,
              [ConfigKey.NAME]: `NAME-${customHeartbeatId0}`,
            },
            {
              ...monitors[1],
              [ConfigKey.CUSTOM_HEARTBEAT_ID]: customHeartbeatId1,
              [ConfigKey.NAME]: `NAME-${customHeartbeatId1}`,
            },
          ].map(saveMonitor)
        );

        const resp = await supertest
          .get(
            `${API_URLS.SYNTHETICS_MONITORS}?page=1&perPage=10&sortField=name.keyword&sortOrder=asc&monitorQueryIds=${customHeartbeatId0}&monitorQueryIds=${customHeartbeatId1}`
          )
          .expect(200);

        const resultMonitorIds = resp.body.monitors
          .map(({ attributes: { id } }: { attributes: Partial<MonitorFields> }) => id)
          .filter((id: string, index: number, arr: string[]) => arr.indexOf(id) === index); // Filter only unique
        expect(resultMonitorIds.length).eql(2);
        expect(resultMonitorIds).eql([customHeartbeatId0, customHeartbeatId1]);
      });
    });

    describe('get one monitor', () => {
      it('should get by id', async () => {
        const [{ id: id1 }] = await Promise.all(monitors.map(saveMonitor));

        const apiResponse = await supertest
          .get(API_URLS.GET_SYNTHETICS_MONITOR.replace('{monitorId}', id1) + '?decrypted=true')
          .expect(200);

        expect(apiResponse.body.attributes).eql({
          ...monitors[0],
          [ConfigKey.MONITOR_QUERY_ID]: apiResponse.body.id,
          [ConfigKey.CONFIG_ID]: apiResponse.body.id,
          revision: 1,
        });
      });

      it('returns 404 if monitor id is not found', async () => {
        const invalidMonitorId = 'invalid-id';
        const expected404Message = `Monitor id ${invalidMonitorId} not found!`;

        const getResponse = await supertest
          .get(API_URLS.GET_SYNTHETICS_MONITOR.replace('{monitorId}', invalidMonitorId))
          .set('kbn-xsrf', 'true');

        expect(getResponse.status).eql(404);
        expect(getResponse.body.message).eql(expected404Message);
      });

      it('validates param length', async () => {
        const veryLargeMonId = new Array(1050).fill('1').join('');

        await supertest
          .get(API_URLS.GET_SYNTHETICS_MONITOR.replace('{monitorId}', veryLargeMonId))
          .set('kbn-xsrf', 'true')
          .expect(400);
      });
    });
  });
}
