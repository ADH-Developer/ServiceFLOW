import React from 'react';
import AdminDashboardLayout from '../../components/Dashboard/AdminDashboardLayout';
import WorkflowView from '../../components/Workflow/WorkflowView';
import { withStaffAuth } from '../../utils/withStaffAuth';
import type { NextPage } from 'next';

const WorkflowPage: NextPage = () => {
    return (
        <AdminDashboardLayout>
            <WorkflowView />
        </AdminDashboardLayout>
    );
};

export default withStaffAuth(WorkflowPage); 